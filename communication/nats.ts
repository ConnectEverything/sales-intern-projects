import {
  connect, jwtAuthenticator
} from "../lib/nats.js";
import type { NatsConnection, JetStreamClient, KV } from "https://deno.land/x/nats@v1.13.0/src/mod.ts";

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

console.log("nats.ts is running again");

export class NatsCon {
  nc!: NatsConnection
  js!: JetStreamClient
  roomBucket!: KV

  async createConnection() {
    console.log("This is what nc is in natsCon: " + this.nc);
    
    if (!this.nc) {
      const res = await fetch('/api/creds');
      const { jwt, seed } = await res.json();

      this.nc = await connect({ 
        servers: 'wss://connect.ngs.global',
        authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed))
      })

      const jsm = await this.nc.jetstreamManager();
      await jsm.streams.add({ name: "rooms", subjects: ["rooms.*"], max_bytes: 1000000});
    }

    return this.nc
  }

  async getJetstreamClient() {
    console.log("This is what js is in natsCon: " + this.js);
    if (!this.js) {
      const nc = await this.createConnection();
      this.js = await nc.jetstream();
    }
    return this.js
  }

  async getKVClient() {
    console.log("This is what roomBucket is in natsCon: " + this.roomBucket);
    if (!this.roomBucket) {
      const js = await this.getJetstreamClient();
      this.roomBucket = await js.views.kv("bucketOfRooms", { maxBucketSize: 10000000, maxValueSize: 131072 });
    }
    return this.roomBucket
  }

  drain() {
    if (this.nc) {
      this.nc.drain();
    }
  }
}

export const natsCon = new NatsCon();