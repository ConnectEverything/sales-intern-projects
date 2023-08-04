package models

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	UpdateRoomsName     = "room_updates"
	UpdateRoomKeyPrefix = "updateRoom"
)

type ChatRoom struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	MessageCount  uint32    `json:"messageCount"`
	LastMessageAt time.Time `json:"lastMessageAt"`
}

type ChatMessageType string

const (
	ChatMessageTypeCreated     ChatMessageType = "created"
	ChatMessageTypeUpdateTitle ChatMessageType = "updatedTitle"
	ChatMessageTypeMessage     ChatMessageType = "message"
	ChatMessageTypeArchive     ChatMessageType = "archive"
	ChatMessageTypeEnter       ChatMessageType = "enter"
	ChatMessageTypeLeave       ChatMessageType = "leave"
	ChatMessageTypeTyping      ChatMessageType = "typing"
	ChatMessageTypeStopTyping  ChatMessageType = "stopTyping"
)

type ChatMessage struct {
	ID     int64           `json:"id"`
	Type   ChatMessageType `json:"type"`
	RoomID string          `json:"roomId"`
	UserID string          `json:"userId"`
	Text   string          `json:"text"`
	At     time.Time       `json:"at"`
}

func SetupNATSRooms(nc *nats.Conn) (nats.KeyValue, error) {
	jsc, err := nc.JetStream()
	if err != nil {
		return nil, fmt.Errorf("failed to get jetstream connection: %w", err)
	}
	roomsKV, err := toolbelt.UpsertKV(jsc, &nats.KeyValueConfig{Bucket: "rooms"})
	if err != nil {
		return nil, fmt.Errorf("failed to upsert kv: %w", err)
	}

	if _, err := toolbelt.UpsertStream(jsc, &nats.StreamConfig{
		Name:        UpdateRoomsName,
		Description: "Stream of room updates",
		Subjects:    []string{UpdateRoomKeyPrefix + ".>"},
	}); err != nil {
		return nil, fmt.Errorf("failed to upsert stream: %w", err)
	}

	return roomsKV, nil
}

func ChatRoomFromKV(kv nats.KeyValue, roomID string) (*ChatRoom, uint64, error) {
	entry, err := kv.Get(roomID)
	if err != nil {
		return nil, 0, err
	}

	room := &ChatRoom{}
	if err := json.Unmarshal(entry.Value(), room); err != nil {
		return nil, 0, err
	}

	return room, entry.Revision(), nil
}

func ChatRoomAddMessage(ctx context.Context, js jetstream.JetStream, kv nats.KeyValue, roomID, userID string, t ChatMessageType, value string) (*ChatMessage, error) {
	room, expectedRevision, err := ChatRoomFromKV(kv, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	chatMessage := &ChatMessage{
		ID:     toolbelt.NextID(),
		RoomID: roomID,
		UserID: userID,
		Type:   t,
		At:     time.Now(),
		Text:   value,
	}
	b, err := json.Marshal(chatMessage)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal chat message: %w", err)
	}

	subject := fmt.Sprintf("%s.%s.%s.%s", UpdateRoomKeyPrefix, roomID, chatMessage.Type, userID)
	if _, err := js.Publish(ctx, subject, b); err != nil {
		return nil, fmt.Errorf("failed to publish: %w", err)
	}

	room.MessageCount++
	room.LastMessageAt = chatMessage.At
	b, err = json.Marshal(room)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal room: %w", err)
	}

	if _, err := kv.Update(roomID, b, expectedRevision); err != nil {
		return nil, fmt.Errorf("failed to update room: %w", err)
	}

	return chatMessage, nil

}

type ChatMessageWithUser struct {
	MsgID       uint64
	ChatMessage *ChatMessage
	User        *User
}

type ChatRoomMessagesArgs struct {
	JS            jetstream.JetStream
	UsersKv       nats.KeyValue
	RoomId        string
	ChatMessageCh chan<- ChatMessageWithUser
	ErrCh         chan<- error
}

func ChatRoomMessagesCh(ctx context.Context, args ChatRoomMessagesArgs) {
	subject := fmt.Sprintf("%s.%s.>", UpdateRoomKeyPrefix, args.RoomId)

	consumer, err := args.JS.CreateOrUpdateConsumer(ctx, UpdateRoomsName, jetstream.ConsumerConfig{
		FilterSubject: subject,
	})
	if err != nil {
		args.ErrCh <- fmt.Errorf("failed to create consumer: %w", err)
		return
	}
	ci := consumer.CachedInfo()
	defer args.JS.DeleteConsumer(ctx, ci.Stream, ci.Name)

	users := map[string]*User{}

	msgIter, err := consumer.Messages()
	if err != nil {
		args.ErrCh <- fmt.Errorf("failed to get messages: %w", err)
		return
	}
	defer msgIter.Stop()

	for {
		msg, err := msgIter.Next()
		if err != nil {
			args.ErrCh <- fmt.Errorf("failed to get next message: %w", err)
			return
		}

		cm := &ChatMessage{}
		if err = json.Unmarshal(msg.Data(), cm); err != nil {
			args.ErrCh <- fmt.Errorf("failed to unmarshal chat message: %w", err)
			return
		}

		u, ok := users[cm.UserID]
		if !ok {
			u, err = UserFromKV(args.UsersKv, cm.UserID)
			if err != nil {
				args.ErrCh <- fmt.Errorf("failed to get user: %w", err)

			}
			users[cm.UserID] = u
		}

		metadata, err := msg.Metadata()
		if err != nil {
			args.ErrCh <- fmt.Errorf("failed to marshal chat message: %w", err)
			return
		}

		args.ChatMessageCh <- ChatMessageWithUser{
			MsgID:       metadata.Sequence.Stream,
			ChatMessage: cm,
			User:        u,
		}

		msg.Ack()

		// time.Sleep(1 * time.Second)
	}
}

type IsTypingRoomData struct {
	Users       map[string]*User     `json:"users"`
	LastUpdated map[string]time.Time `json:"lastUpdated"`
}
