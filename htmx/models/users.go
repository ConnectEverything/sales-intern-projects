package models

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/nats-io/nats.go"
)

type UserProvider struct {
	Name        string `json:"name,omitempty"`
	Label       string `json:"label,omitempty"`
	OAuthID     string `json:"oauthId,omitempty"`
	OAuthSecret string `json:"oauthSecret,omitempty"`
}

type User struct {
	ID        string `json:"id,omitempty"`
	Name      string `json:"name,omitempty"`
	Email     string `json:"email,omitempty"`
	AvatarURL string `json:"avatarUrl,omitempty"`
}

const UserIDKey = "user"

func WithUser(ctx context.Context, user *User) context.Context {
	//lint:ignore SA1029 gorilla sessions needs the raw string
	return context.WithValue(ctx, UserIDKey, user)
}

func UserFromContext(ctx context.Context) *User {
	user, ok := ctx.Value(UserIDKey).(*User)
	if !ok {
		return nil
	}

	return user
}

func UsersSaveToKV(kv nats.KeyValue, users ...*User) error {
	for _, u := range users {
		b, err := json.Marshal(u)
		if err != nil {
			return fmt.Errorf("failed to marshal user: %w", err)
		}

		if _, err := kv.Put(u.ID, b); err != nil {
			return fmt.Errorf("failed to put user: %w", err)
		}
	}

	return nil
}

func UserFromKV(kv nats.KeyValue, id string) (*User, error) {
	entry, err := kv.Get(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	u := &User{}
	if err := json.Unmarshal(entry.Value(), u); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return u, nil
}
