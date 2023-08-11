import { AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, NATS_ACCOUNT_SEED } from '$env/static/private'
import type { SessionWithID } from '$lib/types'
import GitHub from '@auth/core/providers/github'
import { SvelteKitAuth } from '@auth/sveltekit'
import { redirect, type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { encodeUser } from 'nats-jwt'
import { createUser } from 'nkeys.js'

const authorization: Handle = async ({ event, resolve }) => {
  // Protect any routes under /authenticated
  if (event.url.pathname !== '/') {
    const session = await event.locals.getSession()
    if (!session) {
      throw redirect(303, '/');
    }
  }

  // If the request is still here, just proceed as normally
  return resolve(event)
}

export const handle = sequence(
  SvelteKitAuth({
    providers: [GitHub({ clientId: AUTH_GITHUB_ID, clientSecret: AUTH_GITHUB_SECRET })],
    callbacks: {
      redirect: async (params) => {
        // console.log('redirect', params)
        return params.url
      },
      async jwt({ token, account, user, profile }) {
        if (!account?.provider || !user?.id) return token

        return {
          ...token,
          id: user.id,
          provider: account.provider,
          email: profile?.email,
        }
      },
      session: async ({ session, token }) => {
        const sess = session as SessionWithID;

        const t = token as any
        if (!t.provider || !t.id) throw new Error('invalid token')
        
        const inboxPrefix = `_INBOX.${sess.user?.name}`;
        const natsUser = createUser()
        const natsJWT = await encodeUser(
          `${t.provider}_${t.id}_${sess.user?.name}`,
          natsUser,
          NATS_ACCOUNT_SEED,
          {
            bearer_token: true,
            pub: {
              allow: [
                `svelteRooms.*.${sess.user?.name ?? 'user'}`,
                `svelteTyping.*.${sess.user?.name ?? 'user'}`,
                "$JS.API.INFO", // get info about JS on account
                "$JS.API.STREAM.NAMES", // paged list of streams
                "$JS.API.CONSUMER.CREATE.svelteRooms", // consume rooms stream
                "$JS.API.STREAM.INFO.KV_svelteRoomBucket", // Bind to KV bucket/ stream info for KV_bucketOfRooms
                "$JS.API.CONSUMER.CREATE.KV_svelteRoomBucket", // KV watch, creates consumer for KV_bucketOfRooms
                "$JS.API.DIRECT.GET.KV_svelteRoomBucket.$KV.svelteRoomBucket.*", // Direct Get on KV_bucketOfRooms
                "$KV.svelteRoomBucket.*" // KV service
              ],
              deny: []
            },
            sub: {
              allow: [
                "svelteRooms.>",
                "svelteTyping.>",
                `${inboxPrefix}.>`, // read private inbox
              ],
              deny: []
            }
          }, 
        )

        sess.user = {
          id: token.sub || '',
          name: t?.name || '',
          provider: t.provider || '',
          email: t?.email || '',
          image: t?.picture || '',
        }
        sess.natsJWT = natsJWT

        return {
          ...sess,
        }
      },
    },
  }),
  authorization,
)