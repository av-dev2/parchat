<template>
  <div class="app-layout">
    <!-- Sidebar: conversation list -->
    <div class="sidebar" :class="{ 'hidden-mobile': activeRoom }">
      <div class="header-bar">
        <h1>Parchat</h1>
        <button class="icon-btn" @click="showAddContact = true" title="Add Contact">➕</button>
        <button class="icon-btn" @click="$router.push('/profile')" title="Profile">👤</button>
      </div>
      <div class="search-bar">
        <input v-model="search" placeholder="🔍 Search conversations..." />
      </div>
      <div class="chat-list">
        <div v-if="filteredRooms.length === 0" class="empty-state" style="padding: 40px">
          <p>No conversations yet.<br />Add a contact to start chatting!</p>
        </div>
        <div
          v-for="room in filteredRooms"
          :key="room.room_id"
          class="chat-item"
          :class="{ active: activeRoom === room.room_id }"
          @click="openRoom(room)"
        >
          <div class="avatar">
            {{ getInitial(room.other_name) }}
            <span v-if="room.other_online" class="online-dot"></span>
          </div>
          <div class="chat-item-info">
            <div class="chat-item-top">
              <span class="chat-item-name">{{ room.other_name }}</span>
              <span class="chat-item-time">{{ formatTime(room.last_message_at) }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px">
              <span class="chat-item-preview flex-1">{{ room.last_message || 'No messages yet' }}</span>
              <span v-if="room.unread_count" class="unread-badge">{{ room.unread_count }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="bottom-nav">
        <div class="bottom-nav-items">
          <button class="bottom-nav-item active">
            <span class="nav-icon">💬</span>Chats
          </button>
          <button class="bottom-nav-item" @click="showAddContact = true">
            <span class="nav-icon">➕</span>Add
          </button>
          <button class="bottom-nav-item" @click="$router.push('/profile')">
            <span class="nav-icon">👤</span>Profile
          </button>
        </div>
      </div>
    </div>

    <!-- Main panel: empty state when no room selected (desktop) -->
    <div class="main-panel" :class="{ 'hidden-mobile': !activeRoom }">
      <div v-if="!activeRoom" class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h2>Parchat</h2>
        <p>Select a conversation or add a contact to start messaging.</p>
      </div>
      <template v-else>
        <!-- Use inline ChatRoom when selected on desktop, or navigate on mobile -->
        <div class="header-bar">
          <button class="icon-btn mobile-back" @click="closeRoom">⬅</button>
          <div class="avatar sm">{{ getInitial(activeOther.name) }}</div>
          <h1>
            {{ activeOther.name }}
            <br /><span class="subtitle" v-if="activeOther.online">online</span>
          </h1>
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
      </template>
    </div>

    <!-- Add Contact Modal -->
    <div v-if="showAddContact" class="modal-overlay" @click.self="showAddContact = false">
      <div class="modal-card">
        <h2>Add Contact</h2>
        <div v-if="addError" class="error-message">{{ addError }}</div>
        <div v-if="addSuccess" class="success-message">{{ addSuccess }}</div>
        <form @submit.prevent="doAddContact">
          <div class="form-group">
            <label>Contact UUID</label>
            <input class="form-input" v-model="contactUuid" placeholder="Paste their UUID here" required />
          </div>
          <div class="form-group">
            <label>Nickname (optional)</label>
            <input class="form-input" v-model="contactAlias" placeholder="Give them a nickname" />
          </div>
          <div style="display: flex; gap: 8px">
            <button class="btn btn-secondary flex-1" type="button" @click="showAddContact = false">Cancel</button>
            <button class="btn btn-primary flex-1" type="submit" :disabled="addLoading">
              {{ addLoading ? 'Adding...' : 'Add Contact' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const auth = useAuthStore()
const chatStore = useChatStore()

const search = ref('')
const activeRoom = ref(null)
const activeOther = ref({ name: '', online: false })
const newMessage = ref('')
const messagesEl = ref(null)

const showAddContact = ref(false)
const contactUuid = ref('')
const contactAlias = ref('')
const addError = ref('')
const addSuccess = ref('')
const addLoading = ref(false)

let pollInterval = null

const filteredRooms = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return chatStore.rooms
  return chatStore.rooms.filter(
    (r) => r.other_name?.toLowerCase().includes(q) || r.last_message?.toLowerCase().includes(q),
  )
})

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatMsgTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function openRoom(room) {
  activeRoom.value = room.room_id
  activeOther.value = { name: room.other_name, online: room.other_online }
  await chatStore.loadMessages(room.room_id)
  await chatStore.markRead(room.room_id)
  await nextTick()
  scrollToBottom()
}

function closeRoom() {
  activeRoom.value = null
}

function scrollToBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

async function sendMsg() {
  const content = newMessage.value.trim()
  if (!content) return
  newMessage.value = ''
  await chatStore.sendMessage(activeRoom.value, content)
  await nextTick()
  scrollToBottom()
}

async function doAddContact() {
  addError.value = ''
  addSuccess.value = ''
  addLoading.value = true
  try {
    await chatStore.addContact(contactUuid.value, contactAlias.value || null)
    addSuccess.value = 'Contact added!'
    contactUuid.value = ''
    contactAlias.value = ''
    await chatStore.loadRooms()
    setTimeout(() => {
      showAddContact.value = false
      addSuccess.value = ''
    }, 1200)
  } catch (e) {
    addError.value = e.messages?.[0] || e.message || 'Failed to add contact'
  }
  addLoading.value = false
}

onMounted(async () => {
  await chatStore.loadRooms()
  // Poll for updates
  pollInterval = setInterval(async () => {
    await chatStore.loadRooms()
    if (activeRoom.value) {
      await chatStore.loadMessages(activeRoom.value)
    }
  }, 5000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.mobile-back {
  display: none;
}
@media (max-width: 768px) {
  .mobile-back {
    display: flex;
  }
}
</style>
