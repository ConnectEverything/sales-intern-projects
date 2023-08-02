package models

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/nats-io/nats.go"
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

func SetupNATSRooms(js nats.JetStreamContext) (nats.KeyValue, error) {
	roomsKV, err := toolbelt.UpsertKV(js, &nats.KeyValueConfig{Bucket: "rooms"})
	if err != nil {
		return nil, fmt.Errorf("failed to upsert kv: %w", err)
	}

	if _, err := toolbelt.UpsertStream(js, &nats.StreamConfig{
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

func ChatRoomAddMessage(js nats.JetStreamContext, kv nats.KeyValue, roomID, userID string, t ChatMessageType, value string) error {
	room, expectedRevision, err := ChatRoomFromKV(kv, roomID)
	if err != nil {
		return fmt.Errorf("failed to get room: %w", err)
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
		return fmt.Errorf("failed to marshal chat message: %w", err)
	}

	subject := fmt.Sprintf("%s.%s.%s.%s", UpdateRoomKeyPrefix, roomID, chatMessage.Type, userID)
	if _, err := js.Publish(subject, b); err != nil {
		return fmt.Errorf("failed to publish: %w", err)
	}

	room.MessageCount++
	room.LastMessageAt = chatMessage.At
	b, err = json.Marshal(room)
	if err != nil {
		return fmt.Errorf("failed to marshal room: %w", err)
	}

	if _, err := kv.Update(roomID, b, expectedRevision); err != nil {
		return fmt.Errorf("failed to update room: %w", err)
	}

	return nil

}

func ChatRoomMessages(js nats.JetStreamContext, usersKV nats.KeyValue, roomID string) (chatMessages []*ChatMessage, users map[string]*User, err error) {
	subject := fmt.Sprintf("%s.%s.>", UpdateRoomKeyPrefix, roomID)
	log.Print(subject)
	sub, err := js.PullSubscribe(subject, "")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to subscribe: %w", err)
	}
	defer sub.Unsubscribe()

	msgs, err := sub.Fetch(1000)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch messages: %w", err)
	}

	for _, msg := range msgs {
		chatMessage := &ChatMessage{}
		if err = json.Unmarshal(msg.Data, chatMessage); err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal chat message: %w", err)
		}

		if chatMessage.RoomID == roomID {
			chatMessages = append(chatMessages, chatMessage)
		}
		msg.Ack()
	}

	users = map[string]*User{}
	for _, m := range chatMessages {
		if _, ok := users[m.UserID]; !ok {

			u, err := UserFromKV(usersKV, m.UserID)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to get user: %w", err)
			}
			users[m.UserID] = u
		}
	}

	return chatMessages, users, nil

}
