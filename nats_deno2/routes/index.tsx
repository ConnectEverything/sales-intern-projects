import { Head } from "$fresh/runtime.ts";
import { useEffect } from "preact/hooks";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import { natsClient, natsJetstreamClient, natsKVClient, decodeFromBuf } from "../communication/nats.ts";
import { connect } from "https://raw.githubusercontent.com/nats-io/nats.ws/main/src/mod.ts";
import * as nats from "https://deno.land/x/nats/src/mod.ts";


export async function handler(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const [roomBucket] = await Promise.all([
    natsKVClient('roomBucket'),
  ])

  const jc = nats.JSONCodec();
  const watch = await roomBucket.watch();
  const roomNames: string[] = [];
  (async () => {
    for await (const e of watch) {
      if (e.operation != "DEL") {
        const dcd = jc.decode(e.value);
        roomNames.push(dcd.name);
      }
    }
      
  })().then();

  // for some reason, the for loop above won't run unless I have this line
  const keys = await roomBucket.keys();

  // for await (const k of keys) {
  //   const room = await roomBucket.get(k);
  //   const decoded = jc.decode(room.value)
  // }

  const response = await ctx.render({
    rooms: roomNames,
  })

  return response;
}

export default function Home({ data }) {

  return (
    <>
      <Head>
        <title>Deno Chat</title>
      </Head>
      <img
        src="/background.png"
        alt="bg"
        class="absolute top-0 left-0 w-full min-h-screen -z-10 bg-gray-900 object-cover"
      />
        <div class="mb-16 mx-8 text-center">
          <img
            class="h-24 mx-auto mb-6"
            src="/logo.svg"
            alt="Deno Logo"
          />
          <span class="block text-3xl font-bold text-black mb-3">
            Deno Chat
          </span>
          <span class="block text-lg -mb-1.5">
            A minimal chat platform template.
          </span>
          <span class="block text-lg">
            It uses{" "}
            <a
              class="font-bold underline"
              href="https://fresh.deno.dev"
              rel="noopener noreferrer"
              target="_blank"
            >
              Fresh
            </a>
            {" + "}
            <a
              class="font-bold underline"
              href="https://supabase.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              NATS
            </a>
            {" + "}
            <a
              class="font-bold underline"
              href="https://twind.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              twind
            </a>
            {" "}
            on Deno Deploy.
          </span>
        </div>
        <ul
          role="list"
          class="max-h-[21.375rem] mx-2 md:mx-0 overflow-y-scroll space-y-4.5"
        >
          <li>
            <a
              href="/new"
              class="flex justify-center items-center bg-white rounded-full h-18 border-2 border-gray-300 transition-colors hover:(bg-green-100 border-green-400) group"
            >
              <div class="w-8 h-8 flex justify-center items-center mr-2.5">
                <img src="/plus.svg" alt="Plus" />
              </div>
              <span class="text-xl font-bold text-gray-900 group-hover:underline group-focus:underline">
                New Room
              </span>
            </a>
          </li>
          {data.rooms.map(name => (
              <li key={name}>
              <a
                href={`/rooms/${name}`}
                class="flex justify-center items-center bg-white rounded-full h-18 border-2 border-gray-300 transition-colors hover:(bg-green-100 border-green-400) group"
              >
                <span class="text-xl font-bold text-gray-900 group-hover:underline group-focus:underline">
                  {name}
                </span>
              </a>
            </li>
          ))}
          </ul>
        
    </>
  );
}
