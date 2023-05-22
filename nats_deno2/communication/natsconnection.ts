import * as nats from "https://deno.land/x/nats/src/mod.ts";
import type { UserMessage } from "../types.ts";
import { connect } from "https://raw.githubusercontent.com/nats-io/nats.ws/main/src/mod.ts";


export class NatsConnection {
  nc: any;
  jsm: any;
  sc: any;
  jc: any;


  constructor() {
    this.sc = nats.StringCodec();
    this.jc = nats.JSONCodec();
  }

  async createConnection() {
    this.nc = await connect({ servers: "ws://localhost:4222" });
    this.jsm = this.nc.jetstreamManager();
  }

  async getRoomMessages(roomName: string) {
    const subj = "chats." + roomName;
    await this.jsm.streams.add({ name: "chatrooms", subjects: [subj] });
    
    // create ephemeral ordered consumer
    const opts = nats.consumerOpts();
    opts.orderedConsumer();

    const msgs: UserMessage[] = [];
    const sub = await this.nc.jetstream().subscribe(subj, opts);
    for await (const msg of sub) {
      const data = this.jc.decode(msg.data);

      msgs.push(data);
      // make a "display chatmessage" type of thing
      console.log(`${data.username}: "${data.message}"`);
    }

    return msgs;
  }
  
  async sendChatMessage(message: UserMessage) {
    // send a chat message to the chat room subject on the stream
    const subj = "chats." + message.roomName;
    await this.jsm.streams.add({ name: "chatrooms", subjects: [subj] });

    await this.nc.publish(subj, message);

    // this.nc.close();
  }

  async publishRoomName(roomName: string) {
    await this.jsm.streams.add({ name: "roomz", subjects: ["room"] });
    await this.nc.publish("room", this.sc.encode(roomName));
  }
  
  async getRoomName() {
    await this.jsm.streams.add({ name: "roomz", subjects: ["room"] });
    
    // create an ephemeral consumer that gets the latest message on the stream only
    const opts = nats.consumerOpts();
    opts.orderedConsumer();
    opts.deliverLast();

    // subscribe to the subject, console should only log "room34"
    const sub = await this.nc.jetstream().subscribe("room", opts)
    for await (const msg of sub) {
      const data = this.sc.decode(msg.data)
      return data;
    }
  }

  async getRooms() {
    await this.jsm.streams.add({ name: "roomz", subjects: ["room"] });
    
    // create an ephemeral consumer
    const opts = nats.consumerOpts();
    opts.orderedConsumer();


    const roomNames: string[] = [];
    const sub = await this.nc.jetstream().subscribe("room", opts)
    for await (const msg of sub) {
      const data = this.sc.decode(msg.data)
      roomNames.push(data);
    }
    return roomNames;
  }

}

export const natsConnection = new NatsConnection(); 