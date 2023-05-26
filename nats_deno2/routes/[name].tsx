import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import { UserMessage } from "../communication/types.ts";




interface Data {
  roomName: string;
  messages: UserMessage;
  username: string;
}

export const handler: Handler<Data> = async (
  req: Request,
  ctx: HandlerContext<Data>,
): Promise<Response> => {
  const roomName = "poopyroom";
  const messages = "thevidu";
  
  return ctx.render({
    roomName,
    messages
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