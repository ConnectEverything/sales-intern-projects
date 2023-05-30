import { Head } from "$fresh/runtime.ts";
import { useEffect, useState } from "preact/hooks";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import Rooms from "../islands/Rooms.tsx";
import { Footer } from "../helpers/Footer.tsx";


export default function Home() {

  return (
    <>
      <Head>
        <title>Deno Chat</title>
      </Head>
      <br /><br /><br /><br /><br />
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
      <Rooms />
      <Footer />
    </>
  );
}