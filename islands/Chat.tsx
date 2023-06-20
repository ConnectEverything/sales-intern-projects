import { useEffect, useReducer, useRef, useState } from "preact/hooks";
import type { MessageView, RoomView, UserView } from "../communication/types.ts";
import { 
  decodeFromBuf, 
  encodeToBuf, 
  natsJetstreamClient, 
  natsKVClient,
  nc, js, roomBucket
 } from "../communication/nats.ts";
import { consumerOpts } from "../lib/nats.js";
import twas from "https://esm.sh/v121/twas@2.1.2/deno/twas.mjs";
import { debounce } from "https://deno.land/std@0.178.0/async/debounce.ts";
import { JSDocMemberName } from "https://deno.land/x/ts_morph@17.0.1/ts_morph.js";

export default function Chat(
  {roomId, roomName, user}: {
    roomId: string;
    roomName: string;
    user: UserView;
  },
) {
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [input, setInput] = useState("");
  const subject = useRef("rooms." + roomId)
  const lastMsgTimeout = useRef<number | null>(null);
  const [inputTimer, setInputTimer] = useState<number | null>(null);
  const messagesContainer = useRef<HTMLDivElement>(null);
  const [typer, setTyper] = useState(""); // could change

  useEffect(() => {
    (async () => {
      const opts = consumerOpts();
      opts.orderedConsumer();

      const sub = await js.subscribe(subject.current, opts);
      for await (const msg of sub) {
        const msgText = decodeFromBuf<MessageView>(msg.data);
        
        setMessages(prevMessages => {
          const newMsgs = [ ...prevMessages, msgText ];
          return newMsgs;
        });
      }
    }) ();
  }, [])

  useEffect(() => {
    // use normal pub/sub for the isTyping
    (async () => {
      const isTypingSub = await nc.subscribe("isTyping." + roomId);
      for await (const msg of isTypingSub) { 
        const userTyping = decodeFromBuf<string>(msg.data);
        setTyper(userTyping);
      }
    }) ();
  }, [])


  useEffect(() => {
    const container = messagesContainer.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    // if the input hasn't been updated in 2 seconds, send a "" as the isTyping
    if (inputTimer) {
      clearTimeout(inputTimer)
    }

    setInputTimer(setTimeout(async () => {
      await nc.publish("isTyping." + roomId, encodeToBuf(""));
    }, 2000))
  }, [input])
  

  const send = async () => {
    if (input === "") {
      return;
    }
    
    const msgToSend: MessageView = {
      text: input,
      createdAt: new Date().toISOString(),
      user: {
        name: user.name,
        avatarURL: user.avatarURL
      }
    }

    try {
      await js.publish(subject.current, encodeToBuf(msgToSend));
      
      if (lastMsgTimeout.current) {
        clearTimeout(lastMsgTimeout.current);
      }

      lastMsgTimeout.current = setTimeout(async () => {
        const roomUpdate: RoomView = {
          name: roomName,
          lastMessageAt: msgToSend.createdAt,
        }

        await roomBucket.update(roomId, encodeToBuf(roomUpdate));
        lastMsgTimeout.current = null;
      }, 5000);

    } catch (err) {
      console.log(err);
    }
    setInput("");
  }


  const sendIsTyping = async () => {
    // send a msg every 5 characters
    if(input.length % 5 === 0 && input !== ""){
      await nc.publish("isTyping." + roomId, encodeToBuf(user.name));
    }
  }

  return (
    <>
      <div class="w-5/6 md:w-1/2 h-2/3 rounded-2xl mb-5 pl-6 flex flex-col pt-4 pb-2">
        <div class="h-8 flex-none pl-1 pr-7 mb-16 flex justify-between items-center">
          <a
            href="/"
            class="h-8 w-8 p-2 flex items-center justify-center hover:bg-gray-200 rounded-2xl"
          >
            <img src="/arrow.svg" alt="Left Arrow" />
          </a>
          <div class="font-medium text-lg">{roomName}</div>
          <div />
        </div>

        <div
          class="flex-auto overflow-y-scroll"
          ref={messagesContainer}
        >
          {messages.map((msg) => <Message message={msg} />)}
        </div>

        <div class="h-6 mt-1">
          {typer && (
            <div class="text-sm text-gray-400">
              <span class="text-gray-800">{typer}</span> is typing...
            </div>
          )}
        </div>
      </div>
      <div class="w-5/6 md:w-1/2 h-16 flex-none rounded-full flex items-center">
        <ChatInput
          input={input}
          onInput={(input) => {
            setInput(input);
            sendIsTyping();
          }}
          onSend={send}
        />
      </div>
    </>
  );
}

function ChatInput({ input, onInput, onSend }: {
  input: string;
  onInput: (input: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <input
        type="text"
        placeholder="Message"
        class="block mx-6 w-full bg-transparent outline-none focus:text-gray-700"
        value={input}
        onInput={(e) => onInput(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
      />
      <button onClick={onSend} class="mx-3 p-2 hover:bg-gray-200 rounded-2xl">
        <svg
          class="w-5 h-5 text-gray-500 origin-center transform rotate-90"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </>
  );
}

function Message({ message }: { message: MessageView }) {
  return (
    <div class="flex mb-4.5">
      <img
        src={message.user.avatarURL}
        alt={`${message.user.name}'s avatar`}
        class="mr-4 w-9 h-9 rounded-full"
      />
      <div>
        <p class="flex items-baseline mb-1.5">
          <span class="mr-2 font-bold">
            {message.user.name}
          </span>
          <span class="text-xs text-gray-400 font-extralight">
            {twas(new Date(message.createdAt).getTime())}
          </span>
        </p>
        <p class="text-sm text-gray-800">{message.text}</p>
      </div>
    </div>
  );
}