import type {
  ChannelMessage,
  RoomIsTypingChannelMessage,
  RoomTextChannelMessage,
  UserView,
} from "./types.ts";

export class RoomChannel {
  #channel: BroadcastChannel;
  // natsConnection: null;
  // jc: null;

  // async init() {
  //   this.jc = JSONCodec()
  //   this.nats = await connect({ servers: "ws://localhost:8000" })
  // }

  constructor(roomId: number) {
    this.#channel = new BroadcastChannel(roomId.toString()); //this.connectToNats(roomId)
  }

  onMessage(handler: (message: ChannelMessage) => void) {
    const listener = (e: MessageEvent) => {
      handler(e.data);
    };
    this.#channel.addEventListener("message", listener);
    return {
      unsubscribe: () => {
        this.#channel.removeEventListener("message", listener);
      },
    };
  }

  close() {
    this.#channel.close();
  }

  sendText(message: Omit<RoomTextChannelMessage, "kind">) {
    this.#channel.postMessage({
      kind: "text",
      ...message,
    });
  }

  sendIsTyping(user: UserView) {
    const message: RoomIsTypingChannelMessage = {
      kind: "isTyping",
      from: user,
    };
    this.#channel.postMessage(message);
  }
}
