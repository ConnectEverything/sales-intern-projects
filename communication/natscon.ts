// import {
//   connect,
//   JSONCodec,
//   StringCodec
// } from "../lib/nats.js";
// import twas from "twas";
// import { decodeFromBuf, encodeToBuf } from "../helpers/nats.ts";
// import * as nats from "https://deno.land/x/nats/src/mod.ts";
// import type { UserMessage } from "../types.ts";
// console.log(Deno.env.get("GITHUB_CLIENT_ID"));
// console.log(Deno.env.get("H"));
// console.log(Deno.env.get("Hj"));
// const nc = await nats.connect({ servers: "ws://localhost:8080" });
// const sc = StringCodec();
// try {
//   await nc.publish("hello", sc.encode("NC Publish IS WORKING"));
//   await nc.publish("hello", sc.encode("NC Publish IS WORKING again"));
//   console.log("bubidu");
  
// } catch(e) {
//   console.log(e);
  
// }


// // const sc = nats.StringCodec();
// // const jc = JSONCodec();
// // const js = nc.jetstream();
// // // create the named KV or bind to it if it exists:
// // const kv = await js.views.kv("roomBucket");
// // kv.watch({ })
// // const msg = {
// //   text: "Publish"
// // }

// // await js.publish("hello", encodeToBuf("thev"));
// nc.close();

// // const room1 = {
// //   name: "Room Siete"
// // }

// // const room2 = {
// //   name: "Room Ocho"
// // }

// // await kv.create("7", jc.encode(room1));
// // await kv.create("8", jc.encode(room2));

// // const keys = await kv.keys();
// // for await (const k of keys) {
// //   console.log(k);
// // }

// // console.log("\n");
// // console.log("\n");

// // const v = await kv.get("3");
// // // console.log(v.value);
// // console.log(v);
// // const decoded = jc.decode(v.value);
// // console.log(decoded.name);




// // // interface Data {
// // //   name: string
// // // }

// // // // const d: string[] = [];
// // // const watch = await kv.watch();
// // // (async () => {
// // //   for await (const e of watch) {
// // //     console.log("THE");
    
// // //     // console.log("Theivduadof")
// // //     // do something with the change
// // //     // console.log(e.value);
// // //     // console.log(e.value);

// // //     if (e.operation != "DEL") {
// // //       // const roomData = decodeFromBuf<Data>(e.value);
// // //       // const decodedE = jc.decode(e.value);
// // //       // console.log(decodedE);
// // //       console.log(e);
      
// // //     }
// // //   }
// // // }) ();

// // /*
// // {
// //   bucket: "roomBucket",
// //   key: "6",
// //   value: Uint8Array(20) [
// //     123,  34, 110,  97, 109, 101,
// //      34,  58,  34,  82, 111, 111,
// //     109,  32,  83, 101, 105, 115,
// //      34, 125
// //   ],
// //   created: 2023-05-22T20:32:53.301Z,
// //   revision: 12,
// //   operation: "PUT",
// //   delta: 0,
// //   length: 20
// // }
// // */


// // // nc.close();

// // // const currentDate = new Date().toISOString();
// // // console.log(twas(new Date(currentDate).getTime()));



