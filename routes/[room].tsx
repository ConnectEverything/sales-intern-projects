import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import { decodeFromBuf } from "../communication/nats.ts";
import { connect, jwtAuthenticator } from "../lib/nats.js";
import type { RoomView, UserView } from "../communication/types.ts";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";
import { gitHubApi } from "../helpers/github.ts";
import { NatsConnection } from "https://deno.land/x/nats@v1.13.0/nats-base-client/mod.ts";



interface Data {
  roomID: string;
  room: RoomView;
  user: UserView;
}

export const handler: Handler<Data> = async (
  req: Request,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  // Get cookie from request header and parse it
  const accessToken = getCookies(req.headers)["deploy_chat_token"];
  const jwt = getCookies(req.headers)["user_jwt"];
  const seed = getCookies(req.headers)["user_seed"];
  if (!accessToken) {
    return Response.redirect(new URL(req.url).origin);
  }
  const userData = await gitHubApi.getUserData(accessToken);

  // get room name
  const roomID = ctx.params.room;

  console.log("Before getting room data: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
  const nc: NatsConnection = await connect({ 
    servers: 'wss://connect.ngs.global',
    authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed))
  })
  const js = await nc.jetstream();
  const roomBucket = await js.views.kv("bucketOfRooms", { maxBucketSize: 10000000, maxValueSize: 131072 });
  
  
  const roomVal = await roomBucket.get(roomID);
  if (!roomVal) {
    return new Response('Room data unavailable', { status: 400 });
  }
  const roomData = decodeFromBuf<RoomView>(roomVal.value);

  nc.close();

  console.log("After getting room data: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
  
  return ctx.render({
    roomID: roomID,
    room: {
      name: roomData.name,
      lastMessageAt: roomData.lastMessageAt,
    },
    user: {
      name: userData.userName,
      avatarURL: userData.avatarUrl
    }
  });
};

export default function Room({ data }: PageProps<Data>) {
  return (
    <>
      <Head>
        <title> | Deno Chat</title>
      </Head>
      <Page>
        <Chat
          roomId={data.roomID}
          roomName={data.room.name}
          user={data.user}
        />
      </Page>
    </>
  );
}