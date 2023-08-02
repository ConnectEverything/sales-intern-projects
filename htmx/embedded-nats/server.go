package embeddednats

import (
	"context"
	"log"
	"os"

	"github.com/cenkalti/backoff/v4"
	"github.com/nats-io/nats-server/v2/server"
)

type NATsEmbeddedNATsServer struct {
	NatsServer *server.Server
}

func NewNatsEmbeddedNATsServer(ctx context.Context, clearData bool) (*NATsEmbeddedNATsServer, error) {
	const dataDir = "./data/example"
	if clearData {
		if err := os.RemoveAll(dataDir); err != nil {
			return nil, err
		}
	}

	// Initialize new server with options
	ns, err := server.NewServer(&server.Options{
		JetStream: true,
		StoreDir:  dataDir,
		Websocket: server.WebsocketOpts{
			Port:  4443,
			NoTLS: true,
		},
		HTTPPort: 8882,
	})

	if err != nil {
		panic(err)
	}

	// Start the server via goroutine
	ns.Start()

	return &NATsEmbeddedNATsServer{
		NatsServer: ns,
	}, nil
}

func (n *NATsEmbeddedNATsServer) Close() error {
	if n.NatsServer != nil {
		n.NatsServer.Shutdown()
	}
	return nil
}

func (n *NATsEmbeddedNATsServer) WaitForServer() {
	b := backoff.NewExponentialBackOff()

	for {
		d := b.NextBackOff()
		ready := n.NatsServer.ReadyForConnections(d)
		if ready {
			break
		}

		log.Printf("NATS server not ready, waited %s, retrying...", d)
	}
}
