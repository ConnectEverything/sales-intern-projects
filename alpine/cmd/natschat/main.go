package main

import (
	"context"
	"fmt"
	"log"
	"time"

	embeddednats "github.com/ConnectEverything/sales-intern-projects/htmx/embedded-nats"
	"github.com/ConnectEverything/sales-intern-projects/htmx/frontend"
	"github.com/joho/godotenv"
	"github.com/nats-io/nats.go"
	"sigs.k8s.io/controller-runtime/pkg/manager/signals"
)

func main() {
	log.SetFlags(log.Lshortfile | log.LstdFlags)

	ctx := signals.SetupSignalHandler()
	if err := run(ctx); err != nil {
		panic(err)
	}
}

func run(ctx context.Context) error {
	godotenv.Load()

	ns, err := embeddednats.NewNatsEmbeddedNATsServer(ctx, false)
	if err != nil {
		return fmt.Errorf("failed to create embedded nats server: %w", err)
	}
	ns.WaitForServer()
	defer ns.Close()

	opts := nats.Options{
		Url:              ns.NatsServer.ClientURL(),
		AllowReconnect:   true,
		MaxReconnect:     -1,
		ReconnectWait:    5 * time.Second,
		Timeout:          5 * time.Second,
		ReconnectBufSize: 128 * 1024 * 1024,
	}
	nc, err := opts.Connect()
	if err != nil {
		log.Printf("can't connect to NATs server: %v", err)
	}
	defer nc.Close()

	if err := frontend.RunBlocking(ctx, nc); err != nil {
		return fmt.Errorf("failed to run frontend: %w", err)
	}

	return nil
}
