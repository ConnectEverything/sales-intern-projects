import { Head } from "$fresh/runtime.ts";
import Counter from "../islands/Counter.tsx";


export default function Home() {
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
          </ul>
    </>
  );
}
