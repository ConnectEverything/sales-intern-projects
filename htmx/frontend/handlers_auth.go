package frontend

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/goccy/go-json"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/go-chi/chi/v5"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"github.com/nats-io/nats.go"
)

func setupAuth(ctx context.Context, router chi.Router, sessionStore sessions.Store, oauthProvidersKV, oauthUsersKV nats.KeyValue) error {
	providersFromEnv := []*models.UserProvider{}
	if err := json.Unmarshal(frontendEnv.AuthJson, &providersFromEnv); err != nil {
		return fmt.Errorf("failed to parse frontendEnv.AuthJson,oviders from env: %w", err)
	}
	for _, provider := range providersFromEnv {
		authCallbackURL := fmt.Sprintf("%s:%d/auth/%s/callback", frontendEnv.Host, frontendEnv.Port, provider.Name)

		var gp goth.Provider
		switch provider.Name {
		case "github":
			gp = github.New(provider.OAuthID, provider.OAuthSecret, authCallbackURL)
		default:
			return fmt.Errorf("unknown provider: %s", provider.Name)
		}

		goth.UseProviders(gp)

		b, err := json.Marshal(provider)
		if err != nil {
			return fmt.Errorf("failed to marshal provider: %w", err)
		}
		if _, err := oauthProvidersKV.Put(provider.Name, b); err != nil {
			return fmt.Errorf("failed to put provider: %w", err)
		}
	}

	gothic.Store = sessionStore

	reqWithProvider := func(r *http.Request) (revisedRequest *http.Request, err error) {
		providerName := strings.ToLower(chi.URLParam(r, "provider"))
		if providerName == "" {
			providerName = ctx.Value("provider").(string)
		}

		if _, err := oauthProvidersKV.Get(providerName); err != nil {
			return nil, fmt.Errorf("failed to get oauth provider: %w", err)
		}

		//lint:ignore SA1029 gorilla sessions needs the raw string
		ctx = context.WithValue(ctx, "provider", providerName)
		revisedRequest = r.WithContext(ctx)
		return revisedRequest, nil
	}

	handleGothUser := func(w http.ResponseWriter, r *http.Request) {
		existingUser := models.UserFromContext(ctx)
		if existingUser != nil {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}

		r, err := reqWithProvider(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if gothUser, err := gothic.CompleteUserAuth(w, r); err == nil {
			u := &models.User{
				ID:        toolbelt.AliasHashEncodedf("%s_%s", gothUser.Provider, gothUser.UserID),
				Name:      gothUser.Name,
				Email:     gothUser.Email,
				AvatarURL: gothUser.AvatarURL,
			}
			if err := models.UsersSaveToKV(oauthUsersKV, u); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			sess, err := sessionStore.Get(r, frontendEnv.SessionKey)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			sess.Values[models.UserIDKey] = u.ID
			if err := sess.Save(r, w); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Redirect to the home page
			http.Redirect(w, r, "/", http.StatusFound)
		} else {
			gothic.BeginAuthHandler(w, r)
		}
	}

	router.Route("/auth", func(authRouter chi.Router) {
		authRouter.Get("/login", func(w http.ResponseWriter, r *http.Request) {
			providers := []*models.UserProvider{}

			spKeys, err := oauthProvidersKV.Keys()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			for _, provider := range spKeys {
				entry, err := oauthProvidersKV.Get(provider)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				p := &models.UserProvider{}
				if err := json.Unmarshal(entry.Value(), p); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				providers = append(providers, p)
			}

			Render(w, PAGE(
				"Login",
				CLS("p-8 min-h-screen"),
				Centerer(
					"",
					"",
					DIV(
						CLS("p-6 text-center rounded shadow-lg tarounded-lg  flex flex-col gap-6 bg-base-200 text-base-content"),
						IMG(
							CLS("rounded-full w-64 h-64 shadow-xl"),
							SRC(staticPath("synadia-logo.png")),
						),
						TERN(
							len(providers) == 0,
							func() NODE {
								return SPAN(
									CLS("uppercase text-3xl font-bold"),
									TXT("no providers"),
								)
							},
							func() NODE {
								return DIV(
									CLS("flex flex-col gap-2"),
									RANGEI(providers, func(i int, sp *models.UserProvider) NODE {

										icon := fmt.Sprintf("mdi:%s", sp.Name)
										enabled := len(sp.OAuthID) > 0 && len(sp.OAuthSecret) > 0
										return A(
											CLSS{
												"btn btn-wide": true,
												"btn-primary":  enabled,
												"btn-disabled": !enabled,
											},
											HREF(fmt.Sprintf("/auth/%s", sp.Name)),
											SPAN(
												CLS("flex gap-1 items-center"),
												ICON(icon),
												TXT(sp.Label),
											),
										)
									}),
								)
							},
						),
						DIV(
							CLS("text-xs text-right"),
							SAFE(" &copy2023 Synadia LLC"),
						),
					),
				),
			))
		})

		// try to get the user without re-authenticating
		authRouter.Get("/{provider}", handleGothUser)
		authRouter.Get("/{provider}/callback", func(w http.ResponseWriter, r *http.Request) {
			// q := r.URL.Query()
			// errStr := q.Get("error")
			// if errStr != "" {
			// 	errDescription := q.Get("error_description")
			// 	if errDescription != "" {
			// 		errStr = fmt.Sprintf("%s: %s", errStr, errDescription)
			// 	}

			// 	http.Error(w, errStr, http.StatusInternalServerError)
			// 	return
			// }

			handleGothUser(w, r)
		})
		authRouter.Get("/logout", func(w http.ResponseWriter, r *http.Request) {
			r, err := reqWithProvider(r)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			gothic.Logout(w, r)

			session, err := sessionStore.Get(r, frontendEnv.SessionKey)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if session.Values[models.UserIDKey] != nil {
				delete(session.Values, models.UserIDKey)
				if err := session.Save(r, w); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}

			http.Redirect(w, r, "/", http.StatusFound)
		})
	})

	return nil
}
