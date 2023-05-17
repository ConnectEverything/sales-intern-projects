import type {
  ChannelMessage,
  RoomIsTypingChannelMessage,
  RoomTextChannelMessage,
  UserView,
} from "./types.ts";

import { connect, StringCodec, JSONCodec } from "nats";

const nc = await connect({
  servers: "ws://localhost:9222"
})
const sc = StringCodec();
const js = nc.jetstream();

const kv = await js.views.kv(room.id)