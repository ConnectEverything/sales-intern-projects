import type {
  JetStreamClient,
  KV,
  NatsConnection,
} from "https://deno.land/x/nats@v1.13.0/src/mod.ts";
import {
  DiscardPolicy,
  RetentionPolicy,
} from "https://deno.land/x/nats@v1.13.0/src/mod.ts";
import { connect, jwtAuthenticator } from "../lib/nats.js";
import { createUser } from "https://deno.land/x/nkeys.js@v1.0.5/src/nkeys.ts";
import { encodeUser } from "https://raw.githubusercontent.com/nats-io/jwt.js/main/src/jwt.ts";
import { denoHelper } from "https://deno.land/x/nkeys.js@v1.0.5/modules/esm/deps.ts";
import { setEd25519Helper } from "https://deno.land/x/nkeys.js@v1.0.5/src/helper.ts";

const enc = new TextEncoder();
export function encodeToBuf(x: any) {
  return enc.encode(JSON.stringify(x));
}

const dec = new TextDecoder();
export function decodeFromBuf<T>(buf: Uint8Array) {
  const str = dec.decode(buf);
  const t: T = JSON.parse(str) as T;
  return t;
}

export class NatsCon {
  nc: NatsConnection;
  username: string;
  private js?: JetStreamClient;
  private roomBucket?: KV;

  constructor(nc: NatsConnection, username: string) {
    this.nc = nc;
    this.username = username;
  }

  async getJetstreamClient() {
    if (!this.js) {
      this.js = await this.nc.jetstream();
    }
    return this.js;
  }

  async getKVClient() {
    if (!this.roomBucket) {
      const js = await this.getJetstreamClient();
      this.roomBucket = await js.views.kv("bucketOfRooms", {
        max_bytes: 100000000,
        maxValueSize: 131072,
      });
    }
    return this.roomBucket;
  }

  async ensureRoomsStreamCreated(): Promise<void> {
    const jsm = await this.nc.jetstreamManager();
    try {
      await jsm.streams.find("rooms.>");
    } catch {
      await jsm.streams.add({
        name: "rooms",
        subjects: ["rooms.>"],
        max_bytes: 100000000,
        max_msg_size: 10000,
        retention: RetentionPolicy.Limits,
        discard: DiscardPolicy.Old,
      });
    }
  }

  drain() {
    if (this.nc) {
      this.nc.drain();
    }
  }
}

// creates a client connection that should be used with an island
// the client connection will have strict permissions associated with it
// that are tied to the User ID
export async function createClientNatsConnection() {
  const res = await fetch("/api/creds");
  const { jwt, seed, inboxPrefix, username } = await res.json();

  const nc = await connect({
    servers: "wss://connect.ngs.global",
    authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed)),
    inboxPrefix: inboxPrefix,
    noEcho: true,
  });

  return new NatsCon(nc, username);
}

let serverNC: Promise<NatsCon> | undefined;

// singleton with the server-side NATS connection
// should only be used in routes.  the connection has no permissions set,
// so it must never be exposed to the client
export function getServerNatsConnection() {
  return serverNC ??= (async () => {
    const accountSeed = Deno.env.get("ACCOUNT_SEED") || "";
    setEd25519Helper(denoHelper);
    const natsUser = createUser();
    const seed = new TextDecoder().decode(natsUser.getSeed());
    const jwt = await encodeUser("server", natsUser, accountSeed);

    return new NatsCon(
      await connect({
        servers: "wss://connect.ngs.global",
        authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed)),
        noEcho: true,
      }),
      "server",
    );
  })();
}
