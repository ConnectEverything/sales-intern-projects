import JSONbig from 'https://cdn.skypack.dev/json-bigint';
import * as nats from "https://deno.land/x/nats/src/mod.ts";
import { ref, watch } from 'https://cdn.skypack.dev/pin/preact@v10.15.0-DNU3yoh4PRINFbLIjPNW/mode=imports/optimized/preact/hooks.js';

// export const natsURL = ref(`ws://${window.location.hostname}:9222`)
// if (!natsURL) throw new Error('VITE_NATS_URL is not set')


let nc = await nats.connect({ 
  servers: "ws://localhost:4222",
})
// watch(natsURL, () => {
//   nc = connect({ servers: [natsURL.value], debug: true })
//   window.location.reload()
// })

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
  return enc.encode(JSONbig.stringify(x))
}

const dec = new TextDecoder()
export function decodeFromBuf<T>(buf: Uint8Array) {
  const str = dec.decode(buf)
  const t: T = JSONbig.parse(str)
  return t
}