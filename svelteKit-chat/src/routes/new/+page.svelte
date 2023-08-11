<script lang="ts">
	import type { RoomView } from "$lib/types";
  import * as xxhash from "xxhash-wasm";
	import { currentRoomID, currentRoomName, encodeToBuf, natsCon } from "../../stores";
	import { goto } from "$app/navigation";
  import { CensorSensor }from 'censor-sensor';
  import { remark } from 'remark';
  import emoji from 'remark-emoji';

  let newRoomName = "";
  const censor = new CensorSensor;
  const emojify = remark().use(emoji);

  async function makeNewRoom() {
    const xxhashAPI = await xxhash.default();
    try {
      const kv = await $natsCon.jetstream().views.kv("svelteRoomBucket", { maxBucketSize: 100000000, maxValueSize: 131072 })

      // create hash based on the room name
      const roomHash = xxhashAPI.h64ToString(newRoomName)

      const cleanedRoomName = (await emojify.process(censor.cleanProfanity(newRoomName))).toString();
      currentRoomID.set(roomHash);
      currentRoomName.set(cleanedRoomName);

      const roomMsg: RoomView = {
        name: cleanedRoomName,
        lastMessageAt: "",
      }

      // if room doesn't exist, create it
      const getRoom = await kv.get(roomHash);
      if (!getRoom) {
        kv.put(roomHash, encodeToBuf(roomMsg));
      }

      goto(`/${roomHash}`)
    } catch (err) {
      alert(`Cannot create room: ${err}`);
    }
  }
</script>

<a href="/">Go back home</a>

<form 
  on:submit|preventDefault={makeNewRoom}
> 
  <div class="flex gap-2 mt-4">
    <div class="form-control flex-1">
      <h3 class="flex justify-center">Make a name for the room</h3>
      <input type="text" placeholder="Room name" bind:value={newRoomName} class="input input-bordered w-full"/>
      <button type="submit" class="btn btn-primary">Create Room</button>
    </div>
  </div>
  
</form>