package frontend

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"time"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/delaneyj/gomponents-iconify/iconify/mdi"
	"github.com/delaneyj/gomponents-iconify/iconify/svg_spinners"
	"github.com/dustin/go-humanize"
	"github.com/go-chi/chi/v5"
	"github.com/goccy/go-json"
	"github.com/haukened/emojify"
	"github.com/microcosm-cc/bluemonday"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/russross/blackfriday/v2"
	"github.com/samber/lo"
)

func setupRoomRoutes(setupCtx context.Context, nc *nats.Conn, roomsRouter chi.Router, roomsKV, usersKV nats.KeyValue) error {
	jsc, err := nc.JetStream()
	if err != nil {
		return err
	}

	js, err := jetstream.New(nc)
	if err != nil {
		return err
	}

	isTypingKV, err := toolbelt.UpsertKV(jsc, &nats.KeyValueConfig{
		Bucket:  "is_typing",
		Storage: nats.MemoryStorage,
		TTL:     1 * time.Hour,
	})
	if err != nil {
		return fmt.Errorf("failed to create is-typing kv: %w", err)
	}

	updatedTyping := func(roomID string, u *models.User, isUserTyping bool) error {
		entry, err := isTypingKV.Get(roomID)
		if err != nil {
			if err != nats.ErrKeyNotFound {
				return fmt.Errorf("failed to get is-typing entry: %w", err)
			}
		}
		var initialBytes []byte

		isTyping := &models.IsTypingRoomData{
			Users:       map[string]*models.User{},
			LastUpdated: map[string]time.Time{},
		}

		revision := uint64(0)
		if entry != nil {
			initialBytes = entry.Value()
			if err := json.Unmarshal(initialBytes, isTyping); err != nil {
				return fmt.Errorf("failed to unmarshal is-typing entry: %w", err)
			}
			revision = entry.Revision()
		}

		now := time.Now()
		if u != nil {
			if isUserTyping {
				isTyping.Users[u.ID] = u
				isTyping.LastUpdated[u.ID] = now
			} else {
				delete(isTyping.Users, u.ID)
				delete(isTyping.LastUpdated, u.ID)
			}
		}

		for userID, t := range isTyping.LastUpdated {
			if now.Sub(t) > 2*time.Second {
				delete(isTyping.Users, userID)
				delete(isTyping.LastUpdated, userID)
			}
		}

		updatedBytes, err := json.Marshal(isTyping)
		if err != nil {
			return fmt.Errorf("failed to marshal is-typing entry: %w", err)
		}

		if !bytes.Equal(initialBytes, updatedBytes) {
			isTypingKV.Update(roomID, updatedBytes, revision)
		}

		return nil
	}

	// cleanup old typing users
	go func() {
		t := time.NewTicker(2 * time.Second)
		for {
			select {
			case <-setupCtx.Done():
				return
			case <-t.C:
				rooms, _ := isTypingKV.Keys()
				for _, room := range rooms {
					if err := updatedTyping(room, nil, false); err != nil {
						panic(err)
					}

				}
			}
		}
	}()

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
			room, _, err := models.ChatRoomFromKV(roomsKV, roomID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			scrollToBottom := XON("htmx:after-settle", `async function(e){
				const body = document.getElementById('messages-container')
				$scrollto(body)
			}`)

			Render(w, loggedInPage(r.Context(), roomID,
				DIV(
					ID("messages-container"),
					ViewTransitionName("room-"+roomID),
					XDATA("{ message: '' }"),
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
						CLS("text-center text-2xl font-bold uppercase"),
						TXT(room.Name),
					),
					DIV(
						ID("chat-messages"),
						CLS("flex flex-col gap-4 p-4 border border-primary rounded-lg flex-1 overflow-y-auto"),
						DIV(
							CLS("flex flex-col gap-4"),
							HXSSE("/rooms/"+roomID+"/messages/stream", "chat"),
							HXSWAP("beforeend"),
							scrollToBottom,
						),
						DIV(
							CLS("divider"),
						),
						DIV(
							HXSSE("/rooms/"+roomID+"/typing", "typing"),
							scrollToBottom,
						),
						DIV(
							CLS("flex gap-2"),
							DIV(
								CLS("form-control flex-1"),
								INPUT(
									XMODEL("message"),
									CLS("input input-bordered"),
									NAME("message"),
									PLACEHOLDER("Message"),
									HXPOST("/rooms/"+roomID+"/typing"),
									HXTRIGGER("keydown throttle:2s"),
									XON("keydown.enter", `$refs.sendButton.click()`),
								),
							),
							svg_spinners.PulseMultiple(
								CLS("htmx-indicator"),
							),
							BUTTON(
								XREF("sendButton"),
								HXPOST("/rooms/"+roomID+"/message"),
								HXSWAP("none"),
								HXINCLUDE("input[name='message']"),
								XON("htmx:trigger", `message = ''`),
								CLS("btn btn-primary"),
								mdi.Send(),
								TXT("Send"),
							),
						),
					),
				)),
			)
		})

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
			ctx := r.Context()
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

			u := models.UserFromContext(ctx)

			msg := []byte(emojify.Render(message))
			msg = blackfriday.Run(msg)
			msg = bluemonday.UGCPolicy().SanitizeBytes(msg)

			if _, err := models.ChatRoomAddMessage(
				ctx,
				js,
				roomsKV,
				room.ID, u.ID, models.ChatMessageTypeMessage, string(msg),
			); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		})

		roomRouter.Post("/typing", func(w http.ResponseWriter, r *http.Request) {
			u := models.UserFromContext(r.Context())
			roomID := chi.URLParam(r, "roomID")

			if err := updatedTyping(roomID, u, true); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		})

		roomRouter.Get("/typing", func(w http.ResponseWriter, r *http.Request) {

			flusher, ok := w.(http.Flusher)
			if !ok {
				http.Error(w, "streaming unsupported", http.StatusInternalServerError)
				return
			}

			roomID := chi.URLParam(r, "roomID")

			h := w.Header()
			h.Set("Content-Type", "text/event-stream")
			h.Set("Cache-Control", "no-cache")
			h.Set("Connection", "keep-alive")
			h.Set("Access-Control-Allow-Origin", "*")
			flusher.Flush()

			watch, err := isTypingKV.Watch(roomID)
			if err != nil {
				panic(err)
			}

			prevTxt := ""
			for {
				select {
				case <-r.Context().Done():
					return
				case entry := <-watch.Updates():
					isTyping := &models.IsTypingRoomData{}
					if entry == nil {
						continue
					}
					if err := json.Unmarshal(entry.Value(), isTyping); err != nil {
						panic(err)
					}

					if !frontendEnv.ShowSelfTyping {
						delete(isTyping.Users, models.UserFromContext(r.Context()).ID)
					}
					users := lo.Map(lo.Values(isTyping.Users), func(u *models.User, i int) string {
						return u.Name
					})
					sort.Strings(users)
					var txt string
					if len(users) > 0 {
						txt = fmt.Sprintf("%s is typing...", strings.Join(users, ", "))
					}

					if txt != prevTxt {
						prevTxt = txt
						fmt.Fprintf(w, "event: typing\nid:%s\ndata:", toolbelt.NextEncodedID())
						DIV(
							CLS("flex justify-center items-center"),
							TXT(txt),
						).Render(w)
						fmt.Fprintf(w, "\n\n")
						flusher.Flush()
					}

				}
			}
		})

	})

	return nil
}
