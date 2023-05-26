import { useState, useEffect } from "https://esm.sh/preact@10.13.1/hooks";
import {
  connect,
  NatsConnection,
  KV,
  QueuedIterator,
  KvEntry,
  JSONCodec
} from "../lib/nats.js";
import { decodeFromBuf, natsKVClient } from "../helpers/nats.ts";
// download npm module for nats.ws

interface Data {
  name: string;
}

export default function Connect() {
  const [nc, setConnection] = useState<NatsConnection>();
  const [rooms, setRooms] = useState<Record<string,{name:string}>>({});
  
  
  
  useState(() => {
    (async () => {
      if(!nc) {
        const nats = await connect({servers: ["ws://localhost:8080"]})
        setConnection(nats);
        console.log("connected!");

        const jc = JSONCodec();
        const js = nats.jetstream();
        const roomBucket = await js.views.kv("roomBucket");
        const watch = await roomBucket.watch();
        console.log("watching roomBucket");
        

        for await (const msg of watch) {
          if (msg.operation != "DEL") {
            const roomID = msg.key;
            const msgValue = jc.decode(msg.value);
            // console.log(roomID);
            
            setRooms(prevRooms => {
              const newRooms = { ...prevRooms };
              newRooms[roomID] = msgValue;
              return newRooms;
            });
          
          }
        }
      }
    }) ();
    
  })


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
      {Object.values(rooms).map(room => (
        <li key={room.name}>
          <a
            href="/new"
            class="flex justify-center items-center bg-white rounded-full h-18 border-2 border-gray-300 transition-colors hover:(bg-green-100 border-green-400) group"
          >
            <div class="w-8 h-8 flex justify-center items-center mr-2.5">
              <img src="/plus.svg" alt="Plus" />
            </div>
            <span class="text-xl font-bold text-gray-900 group-hover:underline group-focus:underline">
              {room.name}
            </span>
          </a>   
        </li>
      ))}
    </ul>  
  )
}