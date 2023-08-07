package frontend

import (
	"net/http"

	"github.com/CAFxX/httpcompression"
	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/goccy/go-json"
	"github.com/gorilla/sessions"
	"github.com/nats-io/nats.go"
)

// func corsMiddleware(next bunrouter.HandlerFunc) bunrouter.HandlerFunc {
// 	return func(w http.ResponseWriter, req bunrouter.Request) error {
// 		origin := req.Header.Get("Origin")
// 		if origin == "" {
// 			return next(w, req)
// 		}

// 		h := w.Header()

// 		h.Set("Access-Control-Allow-Origin", origin)
// 		h.Set("Access-Control-Allow-Credentials", "true")

// 		// CORS preflight.
// 		if req.Method == http.MethodOptions {
// 			h.Set("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,HEAD")
// 			h.Set("Access-Control-Allow-Headers", "authorization,content-type")
// 			h.Set("Access-Control-Max-Age", "86400")
// 			return nil
// 		}

// 		return next(w, req)
// 	}
// }

func compressMiddleware() func(next http.Handler) http.Handler {
	compress, errr := httpcompression.DefaultAdapter()
	if errr != nil {
		panic(errr)
	}
	return compress
}

func authMiddleware(userKV nats.KeyValue, sessionStore sessions.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, err := sessionStore.Get(r, frontendEnv.SessionKey)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			ctx := r.Context()
			userID, ok := session.Values[models.UserIDKey].(string)
			if !ok {
				r = r.WithContext(models.WithUser(ctx, nil))
				next.ServeHTTP(w, r)
				return
			}

			userEntry, err := userKV.Get(userID)
			if err != nil {
				delete(session.Values, models.UserIDKey)
				if err := session.Save(r, w); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				// failed to get social provider id, redirect to login
				http.Redirect(w, r, "/auth/login", http.StatusFound)
				return
			}
			b := userEntry.Value()

			u := &models.User{}
			if err := json.Unmarshal(b, u); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			ctx = models.WithUser(ctx, u)
			r = r.WithContext(ctx)
			next.ServeHTTP(w, r)
		})
	}
}

func mustHaveUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := models.UserFromContext(r.Context())
		if user == nil {
			http.Redirect(w, r, "/auth/login", http.StatusFound)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// func redirect(w http.ResponseWriter, req bunrouter.Request, path string) error {
// 	http.Redirect(w, req.Request, path, http.StatusFound)
// 	return nil
// }

// var validate = validator.New()

// func parseAndValidate[T any](req bunrouter.Request, input *T) (*T, error) {
// 	if err := httpin.Decode(req.Request, input); err != nil {
// 		return nil, fmt.Errorf("failed to decode form: %w", err)
// 	}

// 	if err := validate.Struct(input); err != nil {
// 		return nil, fmt.Errorf("failed to validate form: %w", err)
// 	}
// 	return input, nil
// }
