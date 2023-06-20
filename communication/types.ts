export interface RoomView {
  name: string;
  lastMessageAt: string;
}

export interface MessageView {
  text: string;
  createdAt: string;
  user: UserView;
}

export interface UserView {
  name: string;
  avatarURL: string;
}