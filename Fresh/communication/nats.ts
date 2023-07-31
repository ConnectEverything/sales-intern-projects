import type { NatsConnection, JetStreamClient, KV, Subscription } from "https://deno.land/x/nats@v1.13.0/src/mod.ts";
import {
  connect, jwtAuthenticator
} from "../lib/nats.js";
import { setEd25519Helper } from "https://deno.land/x/nkeys.js@v1.0.5/src/helper.ts";
import { denoHelper } from "https://deno.land/x/nkeys.js@v1.0.5/modules/esm/deps.ts";
import { createUser } from "https://deno.land/x/nkeys.js@v1.0.5/src/nkeys.ts";
import { encodeUser } from "https://raw.githubusercontent.com/nats-io/jwt.js/main/src/jwt.ts";
import {
  DiscardPolicy,
  RetentionPolicy,
} from "https://deno.land/x/nats@v1.13.0/src/mod.ts";
import { RoomView } from "./types.ts";

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

export class NatsCon {
  nc!: NatsConnection
  js!: JetStreamClient
  roomBucket!: KV

  async createConnection() {
    if (!this.nc) {
      const res = await fetch('/api/creds');
      const { jwt, seed, inboxPrefix } = await res.json();
      
      this.nc = await connect({ 
        servers: 'wss://connect.ngs.global',
        authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed)),
        inboxPrefix: inboxPrefix,
        noEcho: true
      })
    }

    return this.nc
  }

  async createServerSideConnection() {
    if (!this.nc) {
      const accountSeed = Deno.env.get("ACCOUNT_SEED") || "";
      setEd25519Helper(denoHelper);
      const natsUser = createUser();
      const seed = new TextDecoder().decode(natsUser.getSeed());
      const jwt = await encodeUser("server", natsUser, accountSeed);

      this.nc = await connect({ 
        servers: 'wss://connect.ngs.global',
        authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed)),
        noEcho: true
      })

      const jsm = await this.nc.jetstreamManager();

      await jsm.streams.update("rooms", {
        subjects: ["rooms.>"],
        max_bytes: 100000000,
        max_msg_size: 10000,
        retention: RetentionPolicy.Limits,
        discard: DiscardPolicy.Old,
      });

    }

    return this.nc
  }

  async getJetstreamClient() {
    if (!this.js) {
      const nc = await this.createConnection();
      this.js = await nc.jetstream();
    }
    return this.js
  }

  async getKVClient() {
    if (!this.roomBucket) {
      const js = await this.getJetstreamClient();
      this.roomBucket = await js.views.kv("bucketOfRooms", { maxBucketSize: 100000000, maxValueSize: 131072 });
    }
    return this.roomBucket
  }

  drain() {
    if (this.nc) {
      this.nc.drain();
    }
  }
}

let kvSubscriber: Subscription;
let serverNC: NatsCon;

export function makeNC() {
  if (!serverNC) {
    serverNC = new NatsCon;
  }
}

export function makeKVsubService(roomID: string, username: string) {
  if (kvSubscriber) {
    kvSubscriber.unsubscribe();
  } 
  (async () => {
    makeNC();
    const nc = await serverNC.createServerSideConnection();
    const roomBucket = await serverNC.getKVClient();

    kvSubscriber = nc.subscribe(`updateRoom.${roomID}.${username}`);
    
    for await (const msg of kvSubscriber) {
      const roomUpdate = decodeFromBuf<RoomView>(msg.data);
      const subjectRoomID = msg.subject.split(".")[1]

      await roomBucket.put(subjectRoomID, encodeToBuf(roomUpdate));
    }
  }) ();
}

export { serverNC }
export const natsCon = new NatsCon();