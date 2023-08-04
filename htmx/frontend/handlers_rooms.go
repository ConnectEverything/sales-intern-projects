package frontend

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/delaneyj/gomponents-iconify/iconify/mdi"
	"github.com/dustin/go-humanize"
	"github.com/go-chi/chi/v5"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	lop "github.com/samber/lo/parallel"
	"golang.org/x/exp/slices"
)

func setupRoomsRoutes(setupCtx context.Context, nc *nats.Conn, router chi.Router, usersKV nats.KeyValue) (setupErr error) {
	roomsKV, err := models.SetupNATSRooms(nc)
	if err != nil {
		return fmt.Errorf("failed to setup rooms: %w", err)
	}

	js, err := jetstream.New(nc)
	if err != nil {
		return fmt.Errorf("failed to setup jetstream: %w", err)
	}

	router.Route("/rooms", func(roomsRouter chi.Router) {
		roomsRouter.Use(mustHaveUser)

		newRoomForm := func(err string) NODE {
			return FORM(
				DIV(
					ID("new-room-form"),
					CLS("flex gap-2 mt-4"),
					DIV(
						CLS("form-control flex-1"),
						INPUT(
							HYPERSCRIPT(`on load or keyup if my value is not empty then show #newRoomButton else hide #newRoomButton `),
							CLS("input input-bordered w-full"),
							NAME("name"),
							PLACEHOLDER("Create Room Name"),
						),
						DIV(
							CLS("label-text text-error"),
							TXT(err),
						),
					),
					BUTTON(
						ID("newRoomButton"),
						HXPOST("/rooms/new"),
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

			if _, err := models.ChatRoomAddMessage(r.Context(), js, roomsKV, room.ID, u.ID, models.ChatMessageTypeCreated, ""); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("HX-Redirect", "/rooms/"+room.ID)

		})

		if err := setupRoomRoutes(setupCtx, nc, roomsRouter, roomsKV, usersKV); err != nil {
			setupErr = errors.Join(setupErr, fmt.Errorf("failed to setup room routes: %w", err))
		}
	})

	return setupErr
}
