import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import { decodeFromBuf, serverNC } from "../communication/nats.ts";
import { connect, jwtAuthenticator } from "../lib/nats.js";
import type { MessageView, RoomView, UserView } from "../communication/types.ts";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";
import { gitHubApi } from "../helpers/github.ts";
import { NatsConnection, consumerOpts } from "https://deno.land/x/nats@v1.13.0/nats-base-client/mod.ts";
import { libFolderInMemoryPath } from "https://deno.land/x/ts_morph@17.0.1/common/ts_morph_common.js";



interface Data {
  roomID: string;
  room: RoomView;
  user: UserView;
  initialMessages: MessageView[];
}

export const handler: Handler<Data> = async (
  req: Request,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  // Get cookie from request header and parse it
  console.log("Beginning of room handler: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
  const accessToken = getCookies(req.headers)["deploy_chat_token"];
  if (!accessToken) {
    return Response.redirect(new URL(req.url).origin);
  }
  const userData = await gitHubApi.getUserData(accessToken);

  // get room name
  const roomID = ctx.params.room;

  const js = await serverNC.getJetstreamClient();
  const roomBucket = await serverNC.getKVClient();
  
  const roomVal = await roomBucket.get(roomID);
  if (!roomVal) {
    return new Response('Room data unavailable', { status: 400 });
  }
  const roomData = decodeFromBuf<RoomView>(roomVal.value);

  const opts = consumerOpts();
  opts.orderedConsumer();
  
  console.log("Before chatmsgs: " + new Date().getSeconds() + ":" + new Date().getMilliseconds());
  const chatmsgs: MessageView[] = []
  const sub = await js.subscribe("rooms." + roomID, opts);
  console.log("Subscibed");

  sub.drain();
  
  for await (const msg of sub) {
    console.log("getting the msgs");
    
    const msgText = decodeFromBuf<MessageView>(msg.data);
    chatmsgs.push(msgText);
  }
  
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
    },
    initialMessages: chatmsgs
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
          initialMessages={data.initialMessages}
        />
      </Page>
    </>
  );
}