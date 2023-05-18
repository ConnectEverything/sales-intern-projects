
import * as nats from "https://deno.land/x/nats/src/mod.ts";

const nc = await nats.connect({ servers: "ws://localhost:4222" });

const sc = nats.StringCodec();
const js = nc.jetstream();
// create the named KV or bind to it if it exists:
const kv = await js.views.kv("one");

// create an entry - this is similar to a put, but will fail if the
// key exists

await kv.create("ctogs1220", sc.encode("hi"));

// Values in KV are stored as KvEntries:
// {
//   bucket: string,
//   key: string,
//   value: Uint8Array,
//   created: Date,
//   revision: number,
//   delta?: number,
//   operation: "PUT"|"DEL"|"PURGE"
// }
// The operation property specifies whether the value was
// updated (PUT), deleted (DEL) or purged (PURGE).

// you can monitor values modification in a KV by watching.
// You can watch specific key subset or everything.
// Watches start with the latest value for each key in the
// set of keys being watched - in this case all keys
const watch = await kv.watch();
(async () => {
  for await (const e of watch) {
    // do something with the change
    console.log(
      `watch: ${e.key}: ${e.operation} ${e.value ? sc.decode(e.value) : ""}`,
    );
  }
})().then();

await kv.create("ctogs1221", sc.encode("I'm cool"));
await kv.create("bobjones1223", sc.encode("No ur not"));
await kv.create("tkoditu1230", sc.encode("Ur fat"));



const buf: string[] = [];
const keys = await kv.keys();
await (async () => {
  for await (const k of keys) {
    // console.log(k);
    // buf.push(k);
    const val = await kv.get(k);
    console.log(k + `: ${sc.decode(val!.value)}`);
  }
})();

const d = await kv.get("bobjones1223");
console.log("bobjones1223" + `: ${sc.decode(d!.value)}` );
// console.log(`keys contains hello.world: ${buf[0] === "hello.world"}`);

// let h = await kv.history({ key: "hello.world" });
// await (async () => {
//   for await (const e of h) {
//     // do something with the historical value
//     // you can test e.operation for "PUT", "DEL", or "PURGE"
//     // to know if the entry is a marker for a value set
//     // or for a deletion or purge.
//     console.log(
//       `history: ${e.key}: ${e.operation} ${e.value ? sc.decode(e.value) : ""}`,
//     );
//   }
// })();

// deletes the key - the delete is recorded
// await kv.delete("hello.world");

// // purge is like delete, but all history values
// // are dropped and only the purge remains.
// await kv.purge("hello.world");

// stop the watch operation above
watch.stop();

// danger: destroys all values in the KV!
await kv.destroy();