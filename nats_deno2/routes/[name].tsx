import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import type { MessageView, UserView } from "../communication/types.ts";
import { Page } from "../helpers/Page.tsx";
import * as nats from "denonats";




interface Data {
  roomName: string;
}

export const handler: Handler<Data> = async (
  req: Request,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  // const nc = await nats.connect({ servers: "ws://localhost:4222"})
  // const sc = nats.StringCodec();

  // // set an ephemeral consumer to only receive the latest message sent to the stream
  // // in this case it would be the latest name of the room the user wants to join/create
  // const opts = nats.consumerOpts();
  // opts.maxMessages(1);
  // opts.deliverLast();
  // opts.orderedConsumer();

  // const sub = await nc.jetstream().subscribe("chat.rooms_created", opts);
  
  // for await (const msg of sub) {
  //   var roomName = sc.decode(msg.data);
  // }

  const roomName = +ctx.params.room;
  
  return ctx.render({
    // messages,
    roomName
    // user: {
    //   name: user.userName,
    //   avatarUrl: user.avatarUrl,
    // },
  });
};

// export default function Room(props: PageProps) {
//   return <div>Hello {props.params.name}</div>;
// }

export default function Room({ data }) {
  return (
    <>
      <Head>
        <title> | Deno Chat</title>
      </Head>
      <Page>
        <Chat
          roomId="asdf123"
          roomName={data.roomName}
        />
      </Page>
    </>
  );
}