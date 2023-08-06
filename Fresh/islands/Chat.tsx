import { useEffect, useRef, useState } from "preact/hooks";
import type { MessageView, RoomView, UserView } from "../communication/types.ts";
import { 
  decodeFromBuf, 
  encodeToBuf, 
  natsCon
 } from "../communication/nats.ts";
import twas from "twas";
import { badWordsCleanerLoader } from "../helpers/bad_words.ts"
import { JetStreamClient, NatsConnection, KV } from "https://deno.land/x/nats@v1.13.0/nats-base-client/mod.ts";
import { consumerOpts } from "https://deno.land/x/nats@v1.13.0/nats-base-client/jsconsumeropts.ts";
import { start } from "$fresh/server.ts";

export default function Chat(
  {roomId, roomName, user, initialMessages, startAtMsgSeq}: {
    roomId: string;
    roomName: string;
    user: UserView;
    initialMessages: MessageView[];
    startAtMsgSeq: number;
  },
) {
  const [messages, setMessages] = useState<MessageView[]>(initialMessages);
  const [input, setInput] = useState("");
  const subject = useRef("rooms." + roomId + ".*")
  const nc = useRef<NatsConnection>();
  const js = useRef<JetStreamClient>();
  const roomBucket = useRef<KV>();

  const lastMsgTimeout = useRef<number | null>(null);
  const [inputTimer, setInputTimer] = useState<number | null>(null);
  const messagesContainer = useRef<HTMLDivElement>(null);
  const [typer, setTyper] = useState(""); // could change

  useEffect(() => {
    // subscribe to incoming messages in the chat room
    (async () => {
      if (!nc.current) {
        nc.current = await natsCon.createConnection();
      }
      if (!js.current) {
        js.current = await natsCon.getJetstreamClient();
      }
      const opts = consumerOpts();
      opts.orderedConsumer();
      
      // account for any messages that weren't picked up from the ordered push consumer in [room].tsx
      // this issue only occurs in Deno Deploy, not local dev
      opts.startSequence(startAtMsgSeq);

      const sub = await js.current.subscribe(subject.current, opts);
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
    // use normal pub/sub for the isTyping. Subscribe to the isTyping subj
    (async () => {
      if (!nc.current) {
        nc.current = await natsCon.createConnection();
      }
      
      const isTypingSub = await nc.current.subscribe("isTyping." + roomId + ".*");
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
      if (!nc.current) {
        nc.current = await natsCon.createConnection();
      }

      await nc.current.publish("isTyping." + roomId + "." + user.name, encodeToBuf(""));
    }, 2000))
  }, [input])
  

  const send = async () => {
    if (input === "") {
      return;
    }
    const badWordsCleaner = await badWordsCleanerLoader.getInstance();
    const cleanedInput = badWordsCleaner.clean(input);
    
    const msgToSend: MessageView = {
      text: cleanedInput,
      createdAt: new Date().toISOString(),
      user: {
        name: user.name,
        avatarURL: user.avatarURL
      }
    }

    try {
      if (!js.current) {
        js.current = await natsCon.getJetstreamClient();
      }

      // publish message to jetstream w/ appropriate subject
      await js.current.publish("rooms." + roomId + "." + user.name, encodeToBuf(msgToSend));
      
      if (lastMsgTimeout.current) {
        clearTimeout(lastMsgTimeout.current);
      }

      // if a message hasn't been sent in 2.5s, update the room KV pair
      lastMsgTimeout.current = setTimeout(async () => {
        const roomUpdate: RoomView = {
          name: roomName,
          lastMessageAt: msgToSend.createdAt,
        }
        if (!nc.current) {
          nc.current = await natsCon.createConnection();
        }
        await nc.current.publish(`updateRoom.${roomId}.${user.name}`, encodeToBuf(roomUpdate))

        lastMsgTimeout.current = null;
      }, 2500);

    } catch (err) {
      console.log(err);
    }
    setInput("");
  }


  const sendIsTyping = async () => {
    // send an isTyping msg every 5 characters
    if(input.length % 5 === 0 && input !== ""){
      if (!nc.current) {
        nc.current = await natsCon.createConnection();
      }
      await nc.current.publish("isTyping." + roomId + "." + user.name, encodeToBuf(user.name));
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