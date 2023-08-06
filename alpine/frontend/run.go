package frontend

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/benbjohnson/hashfs"
	"github.com/cenkalti/backoff"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/gorilla/sessions"
	"github.com/kelseyhightower/envconfig"
	"github.com/nats-io/nats.go"
	"golang.org/x/crypto/sha3"
	"golang.org/x/exp/slog"
)

type FrontendEnv struct {
	Host           string `default:"http://localhost"`
	Port           int    `default:"1337"`
	SessionKey     string `default:"natschat" split_words:"true"`
	SessionSecret  []byte `required:"true" split_words:"true"`
	StartPage      string `default:"/" split_words:"true"`
	AuthJson       []byte `required:"true" split_words:"true"`
	ShowSelfTyping bool   `default:"false" split_words:"true"`
}

var frontendEnv *FrontendEnv

func RunBlocking(ctx context.Context, nc *nats.Conn) error {
	frontendEnv = &FrontendEnv{}
	if err := envconfig.Process("natschat", frontendEnv); err != nil {
		return fmt.Errorf("failed to process env vars: %w", err)
	}
	h := sha3.New256()
	h.Write(frontendEnv.SessionSecret)
	sessionSecretHash := h.Sum(nil)
	sess := sessions.NewCookieStore(sessionSecretHash)
	sess.Options.SameSite = http.SameSiteStrictMode

	jsc, err := nc.JetStream()
	if err != nil {
		return fmt.Errorf("failed to get jetstream connection: %w", err)
	}

	oauthProvidersKV, err := toolbelt.UpsertKV(jsc, &nats.KeyValueConfig{
		Bucket: "oauth_providers",
	})
	if err != nil {
		return fmt.Errorf("failed to upsert kv: %w", err)
	}

	oauthUsersKV, err := toolbelt.UpsertKV(jsc, &nats.KeyValueConfig{Bucket: "oauth_users"})
	if err != nil {
		return fmt.Errorf("failed to upsert kv: %w", err)
	}

	router := chi.NewRouter()
	router.Use(
		middleware.Logger,
		authMiddleware(oauthUsersKV, sess),
	)

	if err := errors.Join(
		setupAuth(ctx, router, sess, oauthProvidersKV, oauthUsersKV),
		setupRoomsRoutes(ctx, nc, router, oauthUsersKV),
	); err != nil {
		return fmt.Errorf("failed to setup routes: %w", err)
	}

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {

		u := models.UserFromContext(r.Context())
		redirectURL := "/auth/login"

		if u != nil {
			redirectURL = "/rooms"
		}

		http.Redirect(w, r, redirectURL, http.StatusFound)
	})

	router.Handle("/static/*", hashfs.FileServer(staticSys))

	srv := http.Server{
		Addr:    fmt.Sprintf(":%d", frontendEnv.Port),
		Handler: router,
	}

	if err := toolbelt.NewErrGroupSharedCtx(ctx,
		runHotReload(frontendEnv.Port, frontendEnv.StartPage),
		func(ctx context.Context) error {
			log.Printf("listening on %s", srv.Addr)
			return srv.ListenAndServe()
		},
		func(ctx context.Context) error {
			<-ctx.Done()
			return srv.Shutdown(context.Background())
		},
	).Wait(); err != nil {
		return fmt.Errorf("failed to run frontend: %w", err)
	}
	return nil
}

func runHotReload(port int, onStartPath string) toolbelt.CtxErrFunc {
	return func(ctx context.Context) error {
		onStartPath = strings.TrimPrefix(onStartPath, "/")
		localHost := fmt.Sprintf("http://localhost:%d", port)
		localURLToLoad := fmt.Sprintf("%s/%s", localHost, onStartPath)

		// Make sure page is ready before we start
		backoff := backoff.NewExponentialBackOff()
		for {
			if _, err := http.Get(localURLToLoad); err == nil {
				break
			}

			d := backoff.NextBackOff()
			log.Printf("Server not ready. Retrying in %v", d)
			time.Sleep(d)
		}

		// Launch browser in user mode, so we can reuse the same browser session
		wsURL := launcher.NewUserMode().MustLaunch()
		browser := rod.New().ControlURL(wsURL).MustConnect().NoDefaultDevice()

		// Get the current pages
		pages, err := browser.Pages()
		if err != nil {
			return fmt.Errorf("failed to get pages: %w", err)
		}
		var page *rod.Page
		for _, p := range pages {
			info, err := p.Info()
			if err != nil {
				return fmt.Errorf("failed to get page info: %w", err)
			}

			// If we already have the page open, just reload it
			if strings.HasPrefix(info.URL, localHost) {
				p.MustActivate().MustReload()
				page = p

				break
			}
		}
		if page == nil {
			// Otherwise, open a new page
			page = browser.MustPage(localURLToLoad)
		}

		// time.Sleep(1 * time.Second)
		// page.Reload()
		// page.Reload()
		// page.Reload()

		slog.Info("page loaded", "url", localURLToLoad, "page", page.TargetID)
		return nil
	}
}
