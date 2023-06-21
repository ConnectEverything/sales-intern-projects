import {
  connect,
  credsAuthenticator,
  jwtAuthenticator
} from "../lib/nats.js";
// const creds = await Deno.readTextFile('/Users/collintogher/.local/share/nats/nsc/keys/creds/synadia/angry_johnson/default.creds')
// console.log(creds);


const nc = await connect({ 
  servers: 'wss://connect.ngs.global',
  // authenticator: credsAuthenticator(new TextEncoder().encode(creds))
  // authenticator: jwtAuthenticator(Deno.env.get('jwt'), new TextEncoder().encode(Deno.env.get('seed')))
  authenticator: jwtAuthenticator("eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ.eyJqdGkiOiI0NDJON1VUUzNISlRVSjczTklKSlZSR0tKUU80R1A3QUg3Uk1SNkNUQUtRNEs3VU5UNzZBIiwiaWF0IjoxNjg3MjkyOTcxLCJpc3MiOiJBQVAzRFhCQjdKMlo1T01WQTZZVVE0UEhKTTY0UDZGTEtYM1hGVVJGR0Y1RE41UzRYNVk1WENFRyIsIm5hbWUiOiJkZWZhdWx0Iiwic3ViIjoiVUNEVFU3T1lXN0JNWFhDTFQ3UTM2UUdESFhIWkg2R01HVk5ES0FSSjUzNkNDWlhHVTdFTUxTNE0iLCJuYXRzIjp7InB1YiI6e30sInN1YiI6e30sInN1YnMiOi0xLCJkYXRhIjotMSwicGF5bG9hZCI6LTEsInR5cGUiOiJ1c2VyIiwidmVyc2lvbiI6Mn19.fwC6HXNFhS3-hDeDLOnXK5Io7GvCEOJgAuSbEr_3A0_qD8dB92qNFiA4xoUMQIXjiGnRsE9DmbJgsnoapGvfDg", 
  new TextEncoder().encode('SUAHT3XSGWHCWFFQEIC6JHZZPQLMEFM7CPZSZ6O2HYYJVU6J7RM7LCO52Y'))
 })

const js = await natsJetstreamClient();
const jsm = await nc.jetstreamManager();
await jsm.streams.add({ name: "rooms", subjects: ["rooms.*"], max_bytes: 1000000});
const roomBucket = await js.views.kv("bucketOfRooms", { maxBucketSize: 10000000, maxValueSize: 131072 });

export { nc, js, roomBucket };

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