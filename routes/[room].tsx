import { Handler, HandlerContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Chat from "../islands/Chat.tsx";
import { Page } from "../helpers/Page.tsx";
import { decodeFromBuf, natsJetstreamClient, natsKVClient, roomBucket } from "../communication/nats.ts";
import { consumerOpts } from "../lib/nats.js";
import type { RoomView, MessageView, UserView } from "../communication/types.ts";
import { libFolderInMemoryPath } from "https://deno.land/x/ts_morph@17.0.1/common/ts_morph_common.js";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";
import { gitHubApi } from "../helpers/github.ts";



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
  if (!accessToken) {
    return Response.redirect(new URL(req.url).origin);
  }
  const userData = await gitHubApi.getUserData(accessToken);

  // get room name
  const roomID = ctx.params.room;
  
  
  const roomVal = await roomBucket.get(roomID);
  const roomData = decodeFromBuf<RoomView>(roomVal.sm.data);


  
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