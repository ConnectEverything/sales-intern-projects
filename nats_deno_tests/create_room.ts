import * as nats from "https://deno.land/x/nats/src/mod.ts";

// create connection to ws nats server
const nc = await nats.connect({ servers: "ws://localhost:4222" });

const sc = nats.StringCodec();

// create stream roomz with subject room
const jsm = await nc.jetstreamManager();
await jsm.streams.add({ name: "roomz", subjects: ["room"] });

// publish 3 things
nc.publish("room", sc.encode("room1"));
nc.publish("room", sc.encode("room22"));
nc.publish("room", sc.encode("room34"));

// create an ephemeral consumer that gets the latest message on the stream only
const opts = nats.consumerOpts();
opts.orderedConsumer();
opts.maxMessages(1);
opts.deliverLast();

// subscribe to the subject, console should only log "room34"
const sub = await nc.jetstream().subscribe("room", opts)
for await (const msg of sub) {
  const data = sc.decode(msg.data)
  console.log(data);
}

/* The idea is to create/connect to the stream "roomz"(would probably rename that) when you create a new room.
Then, you publish the name of the room you made(the input of the form) into the jetstream.
In the [name].tsx file, you would subscribe to "roomz" and use a consumer with the above
specs to get the latest room name in the "roomz" stream - the room name you just published
*/