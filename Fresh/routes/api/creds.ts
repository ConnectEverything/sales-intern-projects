import { Handler } from "$fresh/server.ts";
import { getCookies } from "https://deno.land/std@0.144.0/http/cookie.ts";

export const handler: Handler = (req: Request): Response => {
  const jwt = getCookies(req.headers)["user_jwt"];
  const seed = getCookies(req.headers)["user_seed"];
  const username = getCookies(req.headers)["user_name"];

  const inboxPrefix = `_INBOX.${username}`

  if (!jwt || !seed || !username) {
    return new Response('Missing JWT, Seed, or username', { status: 400 });
  }

  const data = { jwt, seed, inboxPrefix };
  const body = JSON.stringify(data);
  const headers = new Headers({ 'Content-Type': 'application/json' });

  return new Response(body, { headers });
};