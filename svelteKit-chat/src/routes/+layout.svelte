<script lang="ts">
  import { page } from '$app/stores'
  import { natsCon, signedIn } from '../stores'
  import type { SessionWithID } from '$lib/types'
  import { connect, jwtAuthenticator, type KV, type NatsConnection } from 'nats.ws'
  import { setContext } from 'svelte'
	import { avatarURL, username } from '../stores';
	import { goto } from '$app/navigation';
  import '../tailwind.css'
	import Icon from '@iconify/svelte';
	import { signOut } from '@auth/sveltekit/client';


  let sess = $page.data.session as SessionWithID
  if (sess?.user) signedIn.set(true);

  if ($page.route.id !== '/') {
    if (sess?.user) {
      goto('/')
    }
  }

  $: if ($signedIn) {
    (async () => {
      let natsClient = await connect({
              servers: ['wss://connect.ngs.global'],
              authenticator: jwtAuthenticator(sess.natsJWT),
              timeout: 5000,
              inboxPrefix: `_INBOX.${sess?.user?.name ?? 'user'}`
            })
      natsCon.set(natsClient)
    }) ();
  }

  setContext('sess', sess)
  username.set(sess?.user?.name ?? 'user')
  avatarURL.set(sess?.user?.image ?? 'https://avatars.githubusercontent.com/u/85036544?v=4')
</script>

<svelte:head>
  <title>Synadia Chat</title>
  <meta name="description" content="SynadiaChat" />
</svelte:head>

{#if sess?.user}
<div class="
  sticky top-0 z-30 flex h-16 w-full justify-center bg-opacity-90 backdrop-blur transition-all duration-100 
  bg-base-100 text-base-content
  ">
    <nav class="navbar w-full">
      <div class="flex flex-1 md:gap-1 lg:gap-2">
        <div class="flex items-center gap-2 lg:hidden text-2xl font-bold">
          <a href="/">
            <h1>
              Synadia Chat
            </h1>
          </a>
        </div>
      </div>
      <img class="rounded-full w-12 h-12 shadow-xl" src={sess.user.image} alt="avatar">
      <button class="btn btn-ghost" on:click={signOut}>
        <Icon icon="material-symbols:logout" />
        Sign out
      </button> 
    </nav>
  </div>
  <br> <br>
{/if}

<slot />
