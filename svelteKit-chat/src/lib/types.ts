
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

export interface SessionWithID {
  user?: {
    id: string;
    name?: string | null | undefined;
    provider: string;
    email?: string | null | undefined;
    image?: string | null | undefined;
  };
  expires: string;
  natsJWT: string;
}
