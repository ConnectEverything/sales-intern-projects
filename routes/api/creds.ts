import { Handler } from "$fresh/server.ts";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";
import {User} from "https://raw.githubusercontent.com/nats-io/jwt.js/main/src/types.ts";
import {encodeUser, EncodingOptions} from "https://raw.githubusercontent.com/nats-io/jwt.js/main/src/jwt.ts";
import {gitHubApi} from "../../helpers/github.ts";
import {createUser} from "https://deno.land/x/nkeys.js@v1.0.5/src/nkeys.ts";
import {setEd25519Helper} from "https://deno.land/x/nkeys.js@v1.0.5/src/helper.ts";
import {denoHelper} from "https://deno.land/x/nkeys.js@v1.0.5/modules/esm/deps.ts";

export const handler: Handler = async (req: Request): Promise<Response> => {
  const accessToken = getCookies(req.headers)["deploy_chat_token"];
  if (!accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userData = await gitHubApi.getUserData(accessToken);
  const inboxPrefix = `_INBOX.${userData.userName}`

  const partialUserOpts: Partial<User> = {
    pub: {
      allow: [
        `rooms.*.*.${userData.userName}`, // post a message into a room
        `isTyping.*.${userData.userName}`, // post that they are typing
        `$KV.bucketOfRooms.*.${userData.userName}`, // make a room
        "$JS.API.INFO", // get info about JS on account
        "$JS.API.STREAM.NAMES", // get info about which subject maps to a stream
        "$JS.API.STREAM.INFO.rooms", // stream info for rooms
        "$JS.API.CONSUMER.CREATE.rooms", // consume rooms
        "$JS.API.STREAM.INFO.KV_bucketOfRooms", // stream info for KV_bucketOfRooms
        "$JS.API.CONSUMER.CREATE.KV_bucketOfRooms", // consume KV_bucketOfRooms
        "$JS.API.DIRECT.GET.KV_bucketOfRooms.>", // Direct Get on KV_bucketOfRooms
      ],
      deny: []
    },
    sub: {
      allow: [
        "rooms.>", // read all rooms
        "isTyping.>", // read who is typing
        `${inboxPrefix}.>` // read private inbox
      ],
      deny: []
    }
  }

  const dateRn = new Date()

  const expirationDate = Math.floor(new Date(dateRn.getTime() + 1500 * 1000).getTime() / 1000);
  const partialEncodingOpts: Partial<EncodingOptions> = {
    exp: expirationDate
  }

  const accountSeed = Deno.env.get("ACCOUNT_SEED") || "";
  setEd25519Helper(denoHelper);
  const natsUser = createUser();
  const seed = new TextDecoder().decode(natsUser.getSeed());

  const jwt = await encodeUser(userData.userName, natsUser, accountSeed, partialUserOpts, partialEncodingOpts);

  const data = { jwt, seed, inboxPrefix, username: userData.userName };
  const body = JSON.stringify(data);
  const headers = new Headers({ 'Content-Type': 'application/json' });

  return new Response(body, { headers });
};
