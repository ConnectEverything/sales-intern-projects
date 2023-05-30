import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import { decodeFromBuf, natsJetstreamClient, natsKVClient } from "../helpers/nats.ts";
import { consumerOpts } from "../lib/nats.js";




interface Data {
  roomName: string;
  username: string;
  messages: string[]; // for now
}

interface RoomView {
  name: string
}

export const handler: Handler<Data> = async (
  _req,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  const roomID = ctx.params.room;
  const username = "user1";

  const roomBucket = await natsKVClient('bucketOfRooms');
  const roomVal = await roomBucket.get(roomID);
  const roomName = decodeFromBuf<RoomView>(roomVal.sm.data).name;
  
  // get the initial messages
  const js = await natsJetstreamClient();
  const opts = consumerOpts();
  opts.orderedConsumer();
  const subject = "rooms." + roomID;
  console.log(subject);
  
  
  const messages: string[] = [];
  const sub = await js.subscribe(subject, opts);
  for await (const msg of sub) {
    const msgText = decodeFromBuf<string>(msg.data);
    messages.push(msgText);
  }

  
  return ctx.render({
    roomName,
    username,
    messages
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
          roomId="asdf123"
          roomName={data.roomName}
          initialMessages={data.messages}
        />
      </Page>
    </>
  );
}