import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import {
  decodeFromBuf,
  getServerNatsConnection,
} from "../communication/nats.ts";
import type {
  MessageView,
  RoomView,
  UserView,
} from "../communication/types.ts";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";
import { gitHubApi } from "../helpers/github.ts";
import { consumerOpts } from "https://deno.land/x/nats@v1.13.0/nats-base-client/mod.ts";

interface Data {
  roomID: string;
  room: RoomView;
  user: UserView;
  initialMessages: MessageView[];
  startAtMsgSeq: number;
}

export const handler: Handler<Data> = async (
  req: Request,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  // Get cookie from request header and parse it
  const accessToken = getCookies(req.headers)["deploy_chat_token"];
  if (!accessToken) {
    return Response.redirect(new URL(req.url).origin);
  }
  const userData = await gitHubApi.getUserData(accessToken);

  // get room name
  const roomID = ctx.params.room;

  const natsCon = await getServerNatsConnection();
  const js = await natsCon.getJetstreamClient();
  const roomBucket = await natsCon.getKVClient();
  await natsCon.ensureRoomsStreamCreated();

  // get room data based on the roomID
  const roomVal = await roomBucket.get(roomID);
  if (!roomVal) {
    return new Response("Room data unavailable", { status: 400 });
  }
  const roomData = decodeFromBuf<RoomView>(roomVal.value);

  // get initial messages from chat room jetstream
  const opts = consumerOpts();
  opts.orderedConsumer();
  opts.deliverAll();

  const chatmsgs: MessageView[] = [];
  let lastMsgSequence = 0;

  const sub = await js.subscribe("rooms." + roomID + ".>", opts);
  await sub.drain();

  for await (const msg of sub) {
    const msgText = decodeFromBuf<MessageView>(msg.data);
    chatmsgs.push(msgText);
    lastMsgSequence = msg.seq;
  }

  return ctx.render({
    roomID: roomID,
    room: {
      name: roomData.name,
      lastMessageAt: roomData.lastMessageAt,
    },
    user: {
      name: userData.userName,
      avatarURL: userData.avatarUrl,
    },
    initialMessages: chatmsgs,
    startAtMsgSeq: lastMsgSequence + 1,
  });
};

export default function Room({ data }: PageProps<Data>) {
  return (
    <>
      <Head>
        <title>| Deno Chat</title>
      </Head>
      <Page>
        <Chat
          roomId={data.roomID}
          roomName={data.room.name}
          user={data.user}
          initialMessages={data.initialMessages}
          startAtMsgSeq={data.startAtMsgSeq}
        />
      </Page>
    </>
  );
}
