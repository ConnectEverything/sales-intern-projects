import { useState } from "preact/hooks";
import * as nats from "denonats";
// import * as nats from "https://deno.land/x/nats/src/mod.ts";


export default function AddRoom() {
  const [roomName, setRoomName] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          // // create connection to nats ws server
          // const nc = await nats.connect({ servers: "ws://localhost:4222" });
          // const jsm = await nc.jetstreamManager();
          // const sc = nats.StringCodec();

          // // the user publishes the room name to the rooms_created stream.
          // const stream = "rooms_created";
          // const subj = `chat.rooms_created`;
          
          // // add a message w/ room name to the stream "rooms_created"
          // await jsm.streams.add({ name: stream, subjects: [subj] });
          // await nc.publish("chat.rooms_created", sc.encode(roomName));
          

          // const roomId = Math.random().toString(36).slice(2, 10).toString();
          // const subject = "chat." + roomId;

          // // // close connection
          // await nc.close();
          location.pathname = "/" + roomName;
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
