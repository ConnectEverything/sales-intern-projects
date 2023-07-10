import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import { decodeFromBuf, makeNC, serverNC } from "../communication/nats.ts";
import type { MessageView, RoomView, UserView } from "../communication/types.ts";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";
import { gitHubApi } from "../helpers/github.ts";
import { NatsConnection, consumerOpts } from "https://deno.land/x/nats@v1.13.0/nats-base-client/mod.ts";



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
  const accessToken = getCookies(req.headers)["deploy_chat_token"];
  if (!accessToken) {
    return Response.redirect(new URL(req.url).origin);
  }
  const userData = await gitHubApi.getUserData(accessToken);

  // get room name
  const roomID = ctx.params.room;

  makeNC();
  if (!serverNC.nc) {
    const jwt = getCookies(req.headers)["user_jwt"];
    const seed = getCookies(req.headers)["user_seed"];
    await serverNC.createServerSideConnection(jwt, seed);
  }

  const js = await serverNC.getJetstreamClient();
  const roomBucket = await serverNC.getKVClient();
  
  // get room data based on the roomID
  const roomVal = await roomBucket.get(roomID);
  if (!roomVal) {
    return new Response('Room data unavailable', { status: 400 });
  }
  const roomData = decodeFromBuf<RoomView>(roomVal.value);

  // get initial messages from chat room jetstream
  const opts = consumerOpts();
   opts.orderedConsumer();
  // opts.deliverAll();
  // opts.deliverTo("rooms." + roomID);
  // opts.maxMessages(2);
  
  const chatmsgs: MessageView[] = []

  console.log("Before sub created: " + new Date().getSeconds() + new Date().getMilliseconds());
  const sub = await js.subscribe("rooms." + roomID, opts);
  console.log("After sub created: " + new Date().getSeconds() + new Date().getMilliseconds());
  // const sub = await js.pullSubscribe("rooms."+ roomID, opts);
  // sub.pull()
  console.log("Before sub drained: " + new Date().getSeconds() + new Date().getMilliseconds());
  await sub.drain();
  console.log("After sub drained: " + new Date().getSeconds() + new Date().getMilliseconds());

  console.log("\n");
  for await (const msg of sub) {
    console.log("Msg received at: " + new Date().getSeconds() + new Date().getMilliseconds());
    const msgText = decodeFromBuf<MessageView>(msg.data);
    chatmsgs.push(msgText);
  }

  
  
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