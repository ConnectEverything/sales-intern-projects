import { useState, useEffect } from "preact/hooks"
import { decodeFromBuf, natsCon } from "../communication/nats.ts";
import twas from "twas";
import type { RoomView } from "../communication/types.ts";


export default function Rooms({ initialRooms }: { initialRooms: Record<string,RoomView> }) {
  const [rooms, setRooms] = useState<Record<string,RoomView>>(initialRooms);
  
  useEffect(() => {
    (async () => {
      // watch for any updates on the rooms(new room created, lastMsgSent update)
      const roomBucket = await natsCon.getKVClient();
      const watch = await roomBucket.watch();
 
      for await (const msg of watch) {
        if (msg.operation != "DEL") {
          const roomID = msg.key;
          const msgValue = decodeFromBuf<RoomView>(msg.value);
          console.log(msgValue.name);
          
          
          setRooms(prevRooms => {
            const newRooms = { ...prevRooms };
            newRooms[roomID] = msgValue;
            return newRooms;
          });
        }
      }
    }) ();

    return () => {
      console.log("nats con in rooms drained");
      natsCon.drain();
    }
  }, [])


  return (
    <ul
      role="list"
      class="max-h-[21.375rem] mx-2 md:mx-0 overflow-y-scroll space-y-4.5"
    >
      <li>
        <a
          href="/new"
          class="flex justify-center items-center bg-white rounded-full h-18 border-2 border-gray-300 transition-colors hover:(bg-green-100 border-green-400) group"
        >
          <div class="w-8 h-8 flex justify-center items-center mr-2.5">
            <img src="/plus.svg" alt="Plus" />
          </div>
          <span class="text-xl font-bold text-gray-900 group-hover:underline group-focus:underline">
            New Room
          </span>
        </a>
      </li>

      {Object.entries(rooms)
        .sort(([,a], [,b]) => 
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()) 
        .map(([key, value]) => {
        return (
          <li key={value.name}>
            <a
              href={`/${key}`}
              class="grid grid-cols-3 items-center bg-white rounded-full h-18 border-2 border-gray-300 transition-colors hover:bg-gray-100 hover:border-gray-400 group"
            >
              <div
                class="w-12 h-12 bg-cover rounded-3xl ml-3"
                style={`background-image: url(${
                  "https://deno-avatar.deno.dev/avatar/" + key
                })`}
              />
              <p class="text-xl font-bold text-gray-900 justify-self-center group-hover:underline group-focus:underline">
                {value.name}
              </p>
              <p class="font-medium text-gray-400 mr-8 justify-self-end">
                {value.lastMessageAt
                  ? twas(new Date(value.lastMessageAt).getTime())
                  : "No messages"}
              </p>
            </a>
          </li>
        );
      })}
    </ul>
  )
}