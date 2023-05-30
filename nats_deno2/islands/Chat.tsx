import { useEffect, useRef, useState } from "preact/hooks";
import { encodeToBuf, natsKVClient } from "../helpers/nats.ts";
import {
  connect,
  JSONCodec
} from "../lib/nats.js";
import { escapeChar } from "https://deno.land/x/code_block_writer@11.0.3/utils/string_utils.ts";


export default function AddRoom() {
  const [roomName, setRoomName] = useState("");
  const [roomID, setRoomID] = useState("");
  const [submit, setSubmit] = useState(false);
  const isMounted = useRef(false);


  useEffect(() => {
    (async () => {
      const roomBucket = await natsKVClient("bucketOfRooms");
      const bucketInfo = await roomBucket.status();
      const numRooms = await bucketInfo.values; // get number of entries
      const id = (numRooms + 1).toString(); 

      if (isMounted.current) {
        // const x = await roomBucket.get(id);
        // if (x.revision !== 0) {
        //   throw new Error("")
        // }
        // await roomBucket.update(id, encodeToBuf({ name: roomName }), 0)
        await roomBucket.put(id, encodeToBuf({ name: roomName }))
      } else {
        setRoomID(id);
        isMounted.current = true;
      }
      
    }) ();
  }, [submit]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmit(!submit);
        try {
          location.pathname = "/" + roomID;
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
