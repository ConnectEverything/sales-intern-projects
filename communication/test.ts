// import { NatsConnection } from "https://deno.land/x/nats@v1.13.0/nats-base-client/mod.ts";
// import { jwtAuthenticator } from "../lib/nats.js";
// import { connect } from "../lib/nats.js";
// import { consumerOpts } from "https://deno.land/x/nats@v1.13.0/nats-base-client/jsconsumeropts.ts";
// import { decodeFromBuf } from "./nats.ts";
// import { MessageView } from "./types.ts";


// // console.log("Connecting to nc: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
// const nc: NatsConnection = await connect({ 
//   servers: 'wss://connect.ngs.global',
//   authenticator: jwtAuthenticator("eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ.eyJhdWQiOiJOQVRTIiwibmFtZSI6ImN0b2dzIiwic3ViIjoiVUREMzRMNkRDSUg3QllJVzdVRUpONUpGSDM1UkhHVFdMNktHTzREM01QTjZOTjVaUFQ0MkRZMk4iLCJuYXRzIjp7ImRhdGEiOi0xLCJwYXlsb2FkIjotMSwic3VicyI6LTEsInR5cGUiOiJ1c2VyIiwidmVyc2lvbiI6Mn0sImlzcyI6IkFBUDNEWEJCN0oyWjVPTVZBNllVUTRQSEpNNjRQNkZMS1gzWEZVUkZHRjVETjVTNFg1WTVYQ0VHIiwiaWF0IjoxNjg3ODkyNTYyLCJqdGkiOiJpMHR0ZWJuU0tuUjJQQzBIRW42cmdQL3V2ak1Vbk9CckNiZlhUZWZvWC9ucXRySEFSSTcydUtodEh4b3kra1IvaW5MV0FCOUw3dnF5OFlGSTkwSUEzZz09In0.SdtsP8tO9ULQh1tPDmvOJAVOw3GaVLzvBmOQ1fZfyFr4NzNQNkYXaRF3Ro_053kX1MArAueVGpZdVOtyZWGRCQ", new TextEncoder().encode("SUACVDB2DYPSXOFGU66Z6PWCZLGE66OVISBDX3OPH657ONBXJYTS3PUYEE"))
// })
// // console.log("After: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
// // console.log("\n");
// // console.log("Before jsm: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
// // const jsm = await nc.jetstreamManager();
// // console.log("After jsm: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());

// // console.log("Before adding stream: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
// // await jsm.streams.add({ name: "rooms", subjects: ["rooms.*"], max_bytes: 1000000});
// // console.log("After adding stream: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
// const js = await nc.jetstream()
// const opts = consumerOpts();
// opts.orderedConsumer()

// const sub = await nc.subscribe("rooms.6e6f76b5285c4ffc")
// for await (const msg of sub) {
//   const msgText = decodeFromBuf<MessageView>(msg.data);
//   console.log(msgText);
// }

// nc.close();
