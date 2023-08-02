package frontend

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/delaneyj/gomponents-iconify/iconify/mdi"
	"github.com/delaneyj/gomponents-iconify/iconify/svg_spinners"
	"github.com/dustin/go-humanize"
	"github.com/go-chi/chi/v5"
	"github.com/goccy/go-json"
	"github.com/microcosm-cc/bluemonday"
	"github.com/nats-io/nats.go"
	"github.com/russross/blackfriday/v2"
	lop "github.com/samber/lo/parallel"
	"golang.org/x/exp/slices"
)

func setupRooms(setupCtx context.Context, router chi.Router, js nats.JetStreamContext, usersKV nats.KeyValue) error {

	roomsKV, err := models.SetupNATSRooms(js)
	if err != nil {
		return fmt.Errorf("failed to setup rooms: %w", err)
	}

	router.Route("/rooms", func(roomsRouter chi.Router) {
		roomsRouter.Use(mustHaveUser)

		newRoomForm := func(err string) NODE {
			return FORM(
				DIV(
					ID("new-room-form"),
					CLS("flex gap-2"),
					DIV(
						CLS("form-control flex-1"),
						INPUT(
							HYPERSCRIPT(`on load or keyup if my value is not empty then show #newRoomButton  else hide #newRoomButton `),
							CLS("input input-bordered w-full"),
							NAME("name"),
							PLACEHOLDER("Room Name"),
						),
						DIV(
							CLS("label-text text-error"),
							TXT(err),
						),
					),
					BUTTON(
						ID("newRoomButton"),
						HXPOST("/rooms/new"),
						HXTARGET("#new-room-form"),
						CLS("btn btn-primary"),
						mdi.Plus(),
						ALT("Create Room"),
					),
				),
			)
		}

		roomsRouter.Get("/", func(w http.ResponseWriter, r *http.Request) {

			keys, err := roomsKV.Keys()
			if err != nil {
				if err != nats.ErrNoKeysFound {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}

			rooms := lop.Map(keys, func(key string, i int) *models.ChatRoom {
				cr, _, err := models.ChatRoomFromKV(roomsKV, key)
				if err != nil {
					return nil
				}
				return cr
			})

			slices.SortFunc(rooms, func(a, b *models.ChatRoom) int {
				return int(b.LastMessageAt.Sub(a.LastMessageAt))
			})

			Render(w,
				loggedInPage(r.Context(), "Rooms",
					IF(
						len(rooms) == 0,
						func() NODE {
							return DIV(
								CLS("alert alert-info"),
								mdi.InformationOutline(),
								TXT("No rooms yet. Create one!"),
							)
						},
					),

					DIV(
						CLS("flex flex-col flex-wrap gap-4 w-full"),
						RANGE(rooms, func(r *models.ChatRoom) NODE {
							return DIV(
								CLS("card shadow-lg bg-base-200"),
								A(
									HREF(fmt.Sprintf("/rooms/%s", r.ID)),
									DIV(
										CLS("card-body"),
										DIV(
											CLS("card-title flex justify-between"),
											DIV(
												CLS("uppercase"),
												TXT("#"+r.Name),
											),
											DIV(
												CLS("text-xs text-base-content opacity-50"),
												TXT(r.ID),
											),
										),
										DIV(
											CLS("card-subtitle flex justify-between"),
											DIV(
												TXT("Last message "+humanize.Time(r.LastMessageAt)),
											),
											DIV(
												CLS("badge badge-outline"),
												TXT(humanize.Comma(int64(r.MessageCount))+" messages"),
											),
										),
										// PREJSON(r),
									),
								),
							)
						}),
					),
					newRoomForm(""),
				),
			)
		})

		roomsRouter.Post("/new", func(w http.ResponseWriter, r *http.Request) {
			if err := r.ParseForm(); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			name := r.FormValue("name")
			if name == "" {
				Render(w, newRoomForm("Name is required"))
				return
			}

			u := models.UserFromContext(r.Context())

			room := &models.ChatRoom{
				ID:   toolbelt.NextEncodedID(),
				Name: name,
			}

			b, err := json.Marshal(room)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			if _, err := roomsKV.Put(room.ID, b); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			if err := models.ChatRoomAddMessage(js, roomsKV, room.ID, u.ID, models.ChatMessageTypeCreated, ""); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("HX-Redirect", "/rooms/"+room.ID)

		})

		chatMessageNode := func(m *models.ChatMessage, u *models.User, onLeft bool) NODE {
			txt := m.Text
			switch m.Type {
			case models.ChatMessageTypeCreated:
				txt = "Created the room!"
			}
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

		roomsRouter.Get("/{roomID}", func(w http.ResponseWriter, r *http.Request) {

			roomID := chi.URLParam(r, "roomID")

			chatMessages, users, err := models.ChatRoomMessages(js, usersKV, roomID)
			if err != nil {
				Render(w,
					DIV(
						CLS("alert alert-error"),
						mdi.AlertCircleOutline(),
						TXT(err.Error()),
					),
				)
				return
			}

			Render(w, loggedInPage(r.Context(), roomID,
				DIV(
					CLS("flex flex-col gap-4 h-full"),
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
						RANGEI(chatMessages, func(i int, m *models.ChatMessage) NODE {
							u := users[m.UserID]
							return chatMessageNode(m, u, i%2 == 0)
						}),
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
										on click disable me
										then wait 10ms
										then put '' into #msginput.value
										then wait 100ms
										then go to the bottom of #chat-messages smoothly
										then enable me
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

		roomsRouter.Post("/{roomID}/message", func(w http.ResponseWriter, r *http.Request) {
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

			unsafe := blackfriday.Run([]byte(message))
			safe := bluemonday.UGCPolicy().SanitizeBytes(unsafe)

			chatMessage := &models.ChatMessage{
				ID:     toolbelt.NextID(),
				Type:   models.ChatMessageTypeMessage,
				RoomID: room.ID,
				UserID: u.ID,
				Text:   string(safe),
				At:     time.Now(),
			}

			if err := models.ChatRoomAddMessage(
				js,
				roomsKV,
				room.ID, u.ID, models.ChatMessageTypeMessage, string(safe),
			); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			Render(w, chatMessageNode(chatMessage, u, (room.MessageCount)%2 == 0))
		})

	})

	return nil
}
