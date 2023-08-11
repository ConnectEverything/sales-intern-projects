import { writable } from "svelte/store";
import type { MessageView, RoomView } from "./lib/types";
import type { NatsConnection } from "nats.ws";

export const rooms = writable<Record<string,RoomView>>({});
export const currentRoomID = writable<string>("");
export const currentRoomName = writable<string>("");
export const messages = writable<MessageView[]>([]);
export const username = writable<string>("");
export const avatarURL = writable<string>("");
export const signedIn = writable<boolean>(false);
export const natsCon = writable<NatsConnection>();

const enc = new TextEncoder();
export function encodeToBuf(x: any) {
  return enc.encode(JSON.stringify(x))
}

const dec = new TextDecoder()
export function decodeFromBuf<T>(buf: Uint8Array) {
  const str = dec.decode(buf)
  const t: T = JSON.parse(str) as T;
  return t
}