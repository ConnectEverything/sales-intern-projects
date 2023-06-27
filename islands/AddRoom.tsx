import { useState } from "preact/hooks";
import { encodeToBuf, natsCon } from "../communication/nats.ts";
import { badWordsCleanerLoader } from "../helpers/bad_words.ts"
import { RoomView } from "../communication/types.ts";
import * as xxhash64 from "https://deno.land/x/xxhash64@1.0.0/mod.ts";

export default function AddRoom() {
  const [roomName, setRoomName] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const create = xxhash64.create();
        try {
          const roomHasher = await create;
          const roomHash = roomHasher.hash(roomName, 'hex').toString();

          const badWordsCleaner = await badWordsCleanerLoader.getInstance();
          const cleanedRoomName = badWordsCleaner.clean(roomName);
          const roomMsg: RoomView = {
            name: cleanedRoomName,
            lastMessageAt: "",
          }
          const roomBucket = await natsCon.getKVClient();

          // if room doesn't exist, create it
          const getRoom = await roomBucket.get(roomHash);
          if (!getRoom) {
            await roomBucket.put(roomHash, encodeToBuf(roomMsg));
          }

          location.pathname = "/" + roomHash;
        } catch (err) {
          alert(`Cannot create room: ${err.message}`);
        }
      }}
    >
      <label>
        <div class="mb-2.5">
          <p class="font-semibold">Name</p>
          <p class="font-medium text-xs text-gray-500">
            The name of the chat room.
          </p>
        </div>
        <input
          class="w-full h-9 rounded-md border border-gray-300 pl-3.5"
          type="text"
          name="roomName"
          id="roomName"
          value={roomName}
          onChange={(e) => setRoomName(e.currentTarget.value)}
        />
      </label>
      
      <button
        class="mt-7 flex flex items-center rounded-md h-8 py-2 px-4 bg-gray-800 font-medium text-sm text-white"
        type="submit"
      >
        create
      </button>
      
    </form>
  );
}
