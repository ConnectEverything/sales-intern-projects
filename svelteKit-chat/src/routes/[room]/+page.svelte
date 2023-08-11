<script lang="ts">
  import { avatarURL, currentRoomID, currentRoomName, decodeFromBuf, encodeToBuf, messages, natsCon, username } from "../../stores";
	import type { MessageView, RoomView } from "$lib/types";
	import { onMount, onDestroy, afterUpdate } from "svelte";
  import { consumerOpts } from "nats.ws";
  import type { JetStreamSubscription, Subscription} from "nats.ws";
  import { format } from "timeago.js";
  import { CensorSensor }from 'censor-sensor';
  import { remark } from 'remark';
  import emoji from 'remark-emoji';


  const roomID = $currentRoomID;
  const roomName = $currentRoomName;
  const userName = $username;
  const userAvatar = $avatarURL;
  let chatInput: string;
  let roomSub: JetStreamSubscription;
  let typingSub: Subscription;
  let messagesContainer: HTMLDivElement;
  let msgReceived: boolean = false;
  let userTyping: string;
  let timeout: ReturnType<typeof setTimeout>;
  const censor = new CensorSensor;
  const emojify = remark().use(emoji);

  const js = $natsCon.jetstream();

  onMount(async () => {
    messages.set([]);
    const opts = consumerOpts();
    opts.orderedConsumer();

    roomSub = await js.subscribe(`svelteRooms.${roomID}.*`, opts);
    for await (const msg of roomSub) {
      const msgText = decodeFromBuf<MessageView>(msg.data);
      messages.update(prevMsgs => [...prevMsgs, msgText]);
      msgReceived = !msgReceived;
    }
  })

  onMount(async () => {
    typingSub = $natsCon.subscribe(`svelteTyping.${roomID}.*`)
    for await (const msg of typingSub) {
      userTyping = decodeFromBuf<string>(msg.data);
    }
  })

  onDestroy(async () => {
    await roomSub?.drain();
    await typingSub?.drain();

    clearTimeout(timeout);
  })


  afterUpdate(() => {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  async function send() {
    if (chatInput === "") return
    const kv = await js.views.kv("svelteRoomBucket", { maxBucketSize: 100000000, maxValueSize: 131072 });

    const cleanedMessage = (await emojify.process(censor.cleanProfanity(chatInput))).toString();

    const msgToSend: MessageView = {
      text: cleanedMessage,
      createdAt: new Date().toISOString(),
      user: {
        name: userName,
        avatarURL: userAvatar
      }
    };

    const roomUpdate: RoomView = {
      name: roomName,
      lastMessageAt: new Date().toISOString()
    }

    await js.publish(`svelteRooms.${roomID}.${userName}`, encodeToBuf(msgToSend))
    await kv.put(roomID, encodeToBuf(roomUpdate))
    chatInput = "";
  }

  async function sendIsTyping() {
    if (chatInput.length % 5 === 0 && chatInput !== "") {
      $natsCon.publish(`svelteTyping.${roomID}.${userName}`, encodeToBuf(userName));
    }
  }

  $: if (chatInput) {
    // Clear any existing timeout
    clearTimeout(timeout);

    // Set a new timeout to log to the console if the value hasn't changed in 2 seconds
    timeout = setTimeout(async () => {
        $natsCon.publish(`svelteTyping.${roomID}.${userName}`, encodeToBuf(""));
    }, 2000);
  };
</script>



<a href="/">Go back home</a>
<div class="text-center text-2xl font-bold">
  {roomName}
</div>
<div bind:this={messagesContainer} style="height:500px;overflow:auto;" class="flex flex-col border border-gray-50 p-4">
  {#each $messages as message}
    <div>
      <div class="chat-header">
        <div class="flex gap-2">
          <div class="chat-image avatar w-10">
            <img class="rounded-full" src={message.user.avatarURL} alt="avatar">
          </div>
          <span class="font-bold">{message.user.name}</span>
          <span>{ format(new Date(message.createdAt).getTime()) }</span>
        </div>
      </div> 
      <div class="chat-bubble"> 
        {message.text}
      </div>
    </div>
    <br>
  {/each}
</div>

{#if userTyping}
  <div class="flex justify-center">
    <p>
      <strong>{userTyping}</strong> is typing...
    </p>
  </div>
  <br>
{:else}
  <br>
  <br>
{/if}
<form on:submit|preventDefault={send} class="flex justify-center">
  <input type="text" bind:value={chatInput} on:input={sendIsTyping} class="gap-10"/>
  <button class="btn" type="submit">Send Message</button>
</form>

