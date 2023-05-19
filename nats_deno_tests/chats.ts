import * as nats from "https://deno.land/x/nats/src/mod.ts";


const nc = await nats.connect({ servers: "ws://localhost:4222" });

const sc = nats.StringCodec();
const jc = nats.JSONCodec();

// create stream roomz with subject room
const jsm = await nc.jetstreamManager();
await jsm.streams.add({ name: "chatrooms", subjects: ["chats.*"] });

const ctogsmsg1 = {
  username: "ctogs",
  roomName: "helloworld",
  message: "hello worldy",
  time: "1220"
}

const Bobmsg1 = {
  username: "Bob",
  roomName: "helloworld",
  message: "sup",
  time: "1221"
}

const ctogsmsg2 = {
  username: "ctogs",
  roomName: "helloworld",
  message: "how u doing",
  time: "0428"
}

const thevidusmsg1 = {
  username: "thevidu",
  roomName: "helloworld",
  message: "I'm doing good how are you",
  time: "0530"
}

nc.publish("chats.helloworld", jc.encode(ctogsmsg1));
nc.publish("chats.helloworld", jc.encode(Bobmsg1));
nc.publish("chats.helloworld", jc.encode(ctogsmsg2));
nc.publish("chats.helloworld", jc.encode(thevidusmsg1));

// create an ephemeral consumer
const opts = nats.consumerOpts();
opts.orderedConsumer();

// subscribe to the stream
const sub = await nc.jetstream().subscribe("chats.helloworld", opts)
for await (const msg of sub) {
  const data = jc.decode(msg.data)
  console.log(`${data.username} said: "${data.message}" at ${data.time}`)
}

/*
Once a user enters a chat room, create an ordered consumer that gets all the previous
messages in that stream. Then, I would display it on the UI
*/

nc.drain();
nc.close();