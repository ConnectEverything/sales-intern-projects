import { useEffect, useReducer, useRef, useState } from "preact/hooks";
// import twas from "twas";
import type { MessageView, UserView } from "../communication/types.ts";

export default function Chat(
  {roomId, roomName}: {
    roomId: string;
    roomName: string;
  },
) {
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

        {/* <div
          class="flex-auto overflow-y-scroll"
          ref={messagesContainer}
        >
          {messages.map((msg) => <Message message={msg} />)}
        </div> */}

        {/* <div class="h-6 mt-1">
          {typing && (
            <div class="text-sm text-gray-400">
              <span class="text-gray-800">{typing.user.name}</span> is typing...
            </div>
          )}
        </div> */}
      </div>
      <div class="w-5/6 md:w-1/2 h-16 flex-none rounded-full flex items-center">
        <ChatInput
          
        />
      </div>
    </>
  );
}

function ChatInput() {
  return (
    <>
      <input
        type="text"
        placeholder="Message"
        class="block mx-6 w-full bg-transparent outline-none focus:text-gray-700"
      />
      <button class="mx-3 p-2 hover:bg-gray-200 rounded-2xl">
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