import { Handler } from "$fresh/server.ts";

export const handler: Handler = (_req: Request): Response => {
  const jwt = Deno.env.get("jwt");
  const seed = Deno.env.get("seed");

  // ensure jwt and seed are available in the environment variables
  if (!jwt || !seed) {
    return new Response('Missing JWT or Seed in environment variables', { status: 400 });
  }

  // Create the response object
  const data = { jwt, seed };
  const body = JSON.stringify(data);
  const headers = new Headers({ 'Content-Type': 'application/json' });

  return new Response(body, { headers });
};
