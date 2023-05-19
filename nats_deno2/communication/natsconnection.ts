import * as nats from "https://deno.land/x/nats/src/mod.ts";
import type { UserMessage } from "../types.ts"


export class NatsConnection {
  // create connection to nats ws server
  nc: any;
  jsm: any;
  sc: any;
  jc: any;


  constructor() {
    const sc = nats.StringCodec();
    const jc = nats.JSONCodec();
  }

  async createConnection() {
    const nc = await nats.connect({ servers: "ws://localhost:4222" });
    const jsm = nc.jetstreamManager();
  }

  async connectToRoom(roomName: string) {
    const subj = "chats." + roomName;
    await this.jsm.streams.add({ name: "chatrooms", subjects: [subj] });
    
    // create ephemeral ordered consumer
    const opts = nats.consumerOpts();
    opts.orderedConsumer();

    const sub = await this.nc.jetstream().subscribe(subj, opts);
    for await (const msg of sub) {
      const data = this.jc.decode(msg.data);

      // make a "display chatmessage" type of thing
      console.log(`${data.username}: "${data.message}"`);
    }
  }
  
  async sendChatMessage(message: UserMessage) {
    // send a chat message to the chat room subject on the stream
    const subj = "chats." + message.roomName;
    await this.jsm.streams.add({ name: "chatrooms", subjects: [subj] });

    this.nc.publish(subj, message);

    this.nc.close();
  }
  

}
