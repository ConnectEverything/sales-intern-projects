import { Head } from "$fresh/runtime.ts";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import Rooms from "../islands/Rooms.tsx";
import { Footer } from "../helpers/Footer.tsx";
import { gitHubApi } from "../helpers/github.ts";
import { getCookies, setCookie } from "https://deno.land/std@0.144.0/http/cookie.ts";
import { createUser } from "https://deno.land/x/nkeys.js/modules/esm/mod.ts";
import { encodeUser }from "https://raw.githubusercontent.com/nats-io/jwt.js/main/src/jwt.ts";

export async function handler(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  // This is an oauth callback request.
  const maybeAccessToken = getCookies(req.headers)["deploy_chat_token"];
  if (maybeAccessToken) {
    return ctx.render({});
  }
  
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return ctx.render(false);
  }
  
  const accessToken = await gitHubApi.getAccessToken(code);
  const userData = await gitHubApi.getUserData(accessToken);

  const accountSeed = Deno.env.get("ACCOUNT_SEED");
  const natsUser = createUser();
  const userSeed = new TextDecoder().decode(natsUser.getSeed());
  let jwt = "a";
  if (accountSeed) {
    jwt = await encodeUser(userData.userName, natsUser, accountSeed);
  } else {
    return ctx.render({})
  }
  
  const response = await ctx.render({})
  setCookie(response.headers, {
    name: "user_jwt",
    value: jwt,
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
  });

  setCookie(response.headers, {
    name: "user_seed",
    value: userSeed,
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
  });
  
  setCookie(response.headers, {
    name: "deploy_chat_token",
    value: accessToken,
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
  });

  return response;
}

export default function Home({ data }: PageProps<string>) {

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
      {data
        ? (
          <Rooms />
        )
        :(
          <div class="flex justify-center items-center flex-col">
          <a
            href="/api/login"
            class="bg-gray-900 text-gray-100 hover:text-white shadow font-bold text-sm py-3 px-4 rounded flex justify-start items-center cursor-pointer mt-2"
          >
            <svg
              viewBox="0 0 24 24"
              class="fill-current mr-4 w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>Sign up with Github</span>
          </a>
        </div>
        )
      }
      <Footer />
    </>
  );
}