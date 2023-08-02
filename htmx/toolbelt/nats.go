package toolbelt

import (
	"fmt"

	"github.com/nats-io/nats.go"
)

func UpsertKV(js nats.JetStreamContext, cfg *nats.KeyValueConfig) (nats.KeyValue, error) {
	if cfg == nil || cfg.Bucket == "" {
		return nil, fmt.Errorf("invalid config")
	}

	kv, err := js.KeyValue(cfg.Bucket)
	if err != nil {
		if err != nats.ErrBucketNotFound {
			return nil, fmt.Errorf("failed to kv %s: %w", cfg.Bucket, err)
		}

		kv, err = js.CreateKeyValue(cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to create kv %s: %w", cfg.Bucket, err)
		}
	}

	return kv, nil
}

func UpsertStream(js nats.JetStreamContext, cfg *nats.StreamConfig) (si *nats.StreamInfo, err error) {
	si, err = js.StreamInfo(cfg.Name)
	if err != nil {
		if err != nats.ErrStreamNotFound {
			return nil, fmt.Errorf("failed to get stream info: %w", err)
		}

		si, err = js.AddStream(cfg)
		if err != nil {
			return nil, fmt.Errorf("failed to create stream: %w", err)
		}
	}

	return si, nil
}
