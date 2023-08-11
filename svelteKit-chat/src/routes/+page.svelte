<script lang="ts">
  import type { RoomView, SessionWithID } from '$lib/types'
  import { natsCon, signedIn } from '../stores';
  import { signIn } from '@auth/sveltekit/client'
  import { getContext } from 'svelte'
	import { currentRoomID, currentRoomName, decodeFromBuf, rooms } from '../stores';
  import { format } from 'timeago.js'

  let sess = getContext<SessionWithID>('sess');

  $: if ($signedIn) {
    (async () => {
      const js = $natsCon.jetstream();
      const kv = await js.views.kv("svelteRoomBucket", { maxBucketSize: 100000000, maxValueSize: 131072 })
      const watch = await kv.watch();

      for await (const msg of watch) {
        if (msg.operation !== 'DEL') {
          const roomID = msg.key;
          const msgValue = decodeFromBuf<RoomView>(msg.value);

          rooms.update(prevRooms => {
              const newRooms = { ...prevRooms };
              newRooms[roomID] = msgValue;
              return newRooms;
          });
        }
      }
    }) ();
  }
</script>


{#if sess?.user}
  <a href="/new">
    <div class="card shadow-lg bg-base-200">
      <div class="card-body flex justify-center items-center">
        <div class="card-title flex justify-between">
          <div class="uppercase">
            Make a new room
          </div>
        </div>
      </div>
    </div>
  </a>
  {#if Object.entries($rooms).length === 0}
  <div class="min-h-screen flex flex-col justify-center items-center">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
  {:else}
    <div class="divider"></div>
    <div style="height:500px;overflow:auto;">
      
      {#each Object.entries($rooms)
      .sort(([,a], [,b]) => 
      new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()) 
      as [id, roomData]}
        <a href={`/${id}`} on:click={() => {
          currentRoomID.set(id);
          currentRoomName.set(roomData.name);
        }}>
          <div class="card shadow-lg bg-base-200">
            <div class="card-body">
              <div class="card-title flex justify-between">
                {roomData.name}
              </div>
              <div class="card-subtitle flex justify-between">
                <div>
                  { roomData.lastMessageAt ? format(new Date(roomData.lastMessageAt).getTime()) : "No Messages" }
                </div>
              </div>
            </div>
          </div>
        </a>
        <div class="divider"></div>
      {/each}
    </div>
  {/if}

{:else}
<div class="min-h-screen flex flex-col justify-center items-center">
  <h1 class="h1">Synadia Chat</h1>
  <button class="btn" on:click={() => signIn('github')} on:click={() => {signedIn.set(true)}}>Sign In with GitHub</button>
</div>
{/if}
