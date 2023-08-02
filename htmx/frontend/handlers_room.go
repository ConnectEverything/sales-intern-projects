package frontend

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/delaneyj/gomponents-iconify/iconify/mdi"
	"github.com/delaneyj/gomponents-iconify/iconify/svg_spinners"
	"github.com/dustin/go-humanize"
	"github.com/go-chi/chi/v5"
	"github.com/haukened/emojify"
	"github.com/microcosm-cc/bluemonday"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/russross/blackfriday/v2"
)

func setupRoomRoutes(setupCtx context.Context, nc *nats.Conn, roomsRouter chi.Router, roomsKV, usersKV nats.KeyValue) error {
	chatMessageNode := func(m *models.ChatMessage, u *models.User) NODE {
		txt := m.Text
		switch m.Type {
		case models.ChatMessageTypeCreated:
			txt = "Created the room!"
		}
		onLeft := m.UserID != u.ID
		return DIV(
			ID(fmt.Sprintf("chat-%d", m.ID)),
			CLSS{
				"chat":       true,
				"chat-start": onLeft,
				"chat-end":   !onLeft,
			},
			DIV(
				CLS("chat-image avatar w-10"),
				IMG(
					CLS("rounded-full"),
					SRC(u.AvatarURL),
				),
			),
			DIV(
				CLS("chat-header"),
				DIV(
					CLS("flex gap-2"),
					SPAN(
						CLS("font-bold"),
						TXT(u.Name),
					),
					SPAN(TXT(humanize.Time(m.At))),
				),
			),
			DIV(
				CLS("chat-bubble"),
				RAW(txt),
			),
			DIV(
				CLS("chat-footer"),
				TXT(m.RoomID),
			),
		)
	}

	roomsRouter.Route("/{roomID}", func(roomRouter chi.Router) {

		roomRouter.Get("/", func(w http.ResponseWriter, r *http.Request) {

			roomID := chi.URLParam(r, "roomID")

			Render(w, loggedInPage(r.Context(), roomID,
				DIV(
					CLS("flex flex-col gap-4"),
					DIV(
						A(
							CLS("btn btn-primary"),
							HREF("/rooms"),
							mdi.ArrowLeft(),
							TXT("Rooms"),
						),
					),
					DIV(
						CLS("text-center text-2xl font-bold"),
						TXT("#"+roomID),
					),
					DIV(
						ID("chat-messages"),
						CLS("flex flex-col gap-4 p-4 border border-primary rounded-lg flex-1 overflow-y-auto"),
						DIV(
							CLS("flex flex-col gap-4"),
							HXSSE("/rooms/"+roomID+"/messages/stream", "chat"),
							HXSWAP("beforeend"),
						),
						DIV(
							CLS("divider"),
						),
						FORM(
							HXPOST("/rooms/"+roomID+"/message"),
							HXTARGET("previous .chat"),
							HXSWAP("afterend"),
							DIV(
								CLS("flex gap-2"),

								DIV(
									CLS("form-control flex-1"),
									INPUT(
										ID("msginput"),
										CLS("input input-bordered"),
										NAME("message"),
										PLACEHOLDER("Message"),
									),
								),
								svg_spinners.PulseMultiple(
									CLS("htmx-indicator"),
								),
								BUTTON(
									HYPERSCRIPT(`
										on click wait 10ms
										then put '' into #msginput.value
										then wait 100ms
										then go to the bottom of #chat-messages smoothly
									`),
									TYPE("submit"),
									CLS("btn btn-primary"),
									mdi.Send(),

									TXT("Send"),
								),
							),
						),
					),
				)),
			)
		})

		js, err := jetstream.New(nc)
		if err != nil {
			panic(err)
		}

		roomRouter.Get("/messages/stream", func(w http.ResponseWriter, r *http.Request) {
			roomID := chi.URLParam(r, "roomID")

			flusher, ok := w.(http.Flusher)
			if !ok {
				http.Error(w, "streaming unsupported", http.StatusInternalServerError)
				return
			}
			defer flusher.Flush()

			h := w.Header()
			h.Set("Content-Type", "text/event-stream")
			h.Set("Cache-Control", "no-cache")
			h.Set("Connection", "keep-alive")
			h.Set("Access-Control-Allow-Origin", "*")
			flusher.Flush()

			errCh := make(chan error)
			chatMessageCh := make(chan models.ChatMessageWithUser)

			go models.ChatRoomMessagesCh(r.Context(), models.ChatRoomMessagesArgs{
				JS:            js,
				UsersKv:       usersKV,
				RoomId:        roomID,
				ChatMessageCh: chatMessageCh,
				ErrCh:         errCh,
			})

			renderSSEEvent := func(event, id string, data NODE) error {
				fmt.Fprintf(w, "event: %s\nid:%s\n", event, id)
				fmt.Fprint(w, "data: ")
				if err := data.Render(w); err != nil {
					return fmt.Errorf("failed to render event: %w", err)
				}
				fmt.Fprintf(w, "\n\n")
				flusher.Flush()
				return nil
			}

			i := 0
			for {
				select {
				case <-r.Context().Done():
					return
				case err := <-errCh:
					renderSSEEvent("error", toolbelt.NextEncodedID(), DIV(
						CLS("alert alert-error"),
						mdi.AlertCircleOutline(),
						TXT(err.Error()),
					))
					return
				case cm := <-chatMessageCh:
					u := cm.User
					m := cm.ChatMessage

					if err := renderSSEEvent(
						"chat",
						strconv.Itoa(int(cm.MsgID)),
						chatMessageNode(m, u),
					); err != nil {
						return
					}
				}
				i++
			}
		})

		roomRouter.Post("/message", func(w http.ResponseWriter, r *http.Request) {
			if err := r.ParseForm(); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			roomID := chi.URLParam(r, "roomID")
			room, _, err := models.ChatRoomFromKV(roomsKV, roomID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			message := r.FormValue("message")
			if message == "" {
				http.Error(w, "message is required", http.StatusBadRequest)
				return
			}

			u := models.UserFromContext(r.Context())

			msg := []byte(emojify.Render(message))
			msg = blackfriday.Run(msg)
			msg = bluemonday.UGCPolicy().SanitizeBytes(msg)

			chatMsg, err := models.ChatRoomAddMessage(
				r.Context(),
				js,
				roomsKV,
				room.ID, u.ID, models.ChatMessageTypeMessage, string(msg),
			)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			Render(w, chatMessageNode(chatMsg, u))
		})
	})

	return nil
}
