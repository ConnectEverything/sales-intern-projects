import { deleteCookie } from "https://deno.land/std@0.144.0/http/cookie.ts";

export function handler(req: Request): Response {
  const headers = new Headers({
    "location": new URL(req.url).origin,
  });
  deleteCookie(headers, "deploy_chat_token", {
    path: "/",
  });
  return new Response(null, {
    status: 302,
    headers,
  });
}
