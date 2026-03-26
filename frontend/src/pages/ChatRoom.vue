<template>
  <div style="display: flex; flex-direction: column; height: 100%">
    <div class="header-bar">
      <button class="icon-btn" @click="$router.push('/chats')">⬅</button>
      <div class="avatar sm">{{ getInitial(otherName) }}</div>
      <h1>{{ otherName }}</h1>
    </div>
    <div class="messages-container" ref="messagesEl">
      <div
        v-for="msg in chatStore.messages"
        :key="msg.name"
        class="message-row"
        :class="msg.sender === auth.user?.name ? 'sent' : 'received'"
      >
        <div class="message-bubble">
          <div>{{ msg.content }}</div>
          <div class="message-meta">
            <span class="message-time">{{ formatMsgTime(msg.timestamp) }}</span>
            <span v-if="msg.sender === auth.user?.name && msg.is_read" class="message-read-tick">✓✓</span>
          </div>
        </div>
      </div>
    </div>
    <div class="message-input-area">
      <input v-model="newMessage" @keyup.enter="sendMsg" placeholder="Type a message..." />
      <button class="send-btn" @click="sendMsg" :disabled="!newMessage.trim()">➤</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const props = defineProps({ roomId: String })
const auth = useAuthStore()
const chatStore = useChatStore()
const messagesEl = ref(null)
const newMessage = ref('')
const otherName = ref('')

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function formatMsgTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

async function sendMsg() {
  const content = newMessage.value.trim()
  if (!content) return
  newMessage.value = ''
  await chatStore.sendMessage(props.roomId, content)
  await nextTick()
  scrollToBottom()
}

onMounted(async () => {
  await chatStore.loadMessages(props.roomId)
  await chatStore.markRead(props.roomId)
  // Resolve other participant name from rooms
  const room = chatStore.rooms.find((r) => r.room_id === props.roomId)
  if (room) otherName.value = room.other_name
  await nextTick()
  scrollToBottom()
})
</script>
