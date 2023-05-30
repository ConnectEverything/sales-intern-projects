// nats.ts

// import JSONbig from 'https://cdn.skypack.dev/json-bigint';
import {
  connect
} from "../lib/nats.js";


let nc = await connect({ 
  servers: "ws://localhost:8080",
})

// const js = await natsJetstreamClient();
// const roomBucket = await js.views.kv("bucketOfRooms");
const jsm = await nc.jetstreamManager();
await jsm.streams.add({ name: "rooms", subjects: ["rooms.*"]});

export async function natsClient() {
  while (!nc) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  return nc
}

export async function natsJetstreamClient() {
  const nc = await natsClient()
  return nc.jetstream()
}

export async function natsKVClient(bucket: string) {
  const js = await natsJetstreamClient()
  return js.views.kv(bucket)
}

export async function natsObjectStoreClient(bucket: string) {
  const js = await natsJetstreamClient()
  return js.views.os(bucket)
}

const enc = new TextEncoder()
export function encodeToBuf(x: any) {
  return enc.encode(JSON.stringify(x))
}

const dec = new TextDecoder()
export function decodeFromBuf<T>(buf: Uint8Array) {
  const str = dec.decode(buf)
  const t: T = JSON.parse(str) as T;
  return t
}