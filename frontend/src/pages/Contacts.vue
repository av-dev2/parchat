<template>
  <div style="display: flex; flex-direction: column; height: 100%">
    <div class="header-bar">
      <button class="icon-btn" @click="$router.push('/chats')">⬅</button>
      <h1>Contacts</h1>
      <button class="icon-btn" @click="showAdd = true">➕</button>
    </div>
    <div class="chat-list" style="flex: 1; overflow-y: auto">
      <div v-if="chatStore.contacts.length === 0" class="empty-state" style="padding: 40px">
        <p>No contacts yet. Add one using their UUID!</p>
      </div>
      <div v-for="c in chatStore.contacts" :key="c.name" class="chat-item">
        <div class="avatar">{{ c.display_name?.charAt(0)?.toUpperCase() || '?' }}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">{{ c.display_name }}</div>
          <div class="chat-item-preview">{{ c.contact_uuid }}</div>
        </div>
      </div>
    </div>

    <!-- Add Contact -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-card">
        <h2>Add Contact</h2>
        <div v-if="addErr" class="error-message">{{ addErr }}</div>
        <div v-if="addOk" class="success-message">{{ addOk }}</div>
        <form @submit.prevent="doAdd">
          <div class="form-group">
            <label>Contact UUID</label>
            <input class="form-input" v-model="uuid" required placeholder="Paste their UUID" />
          </div>
          <div class="form-group">
            <label>Nickname (optional)</label>
            <input class="form-input" v-model="alias" placeholder="Give them a nickname" />
          </div>
          <div style="display: flex; gap: 8px">
            <button class="btn btn-secondary flex-1" type="button" @click="showAdd = false">Cancel</button>
            <button class="btn btn-primary flex-1" type="submit">Add</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const showAdd = ref(false)
const uuid = ref('')
const alias = ref('')
const addErr = ref('')
const addOk = ref('')

async function doAdd() {
  addErr.value = ''
  addOk.value = ''
  try {
    await chatStore.addContact(uuid.value, alias.value || null)
    addOk.value = 'Contact added!'
    uuid.value = ''
    alias.value = ''
    await chatStore.loadContacts()
    await chatStore.loadRooms()
    setTimeout(() => { showAdd.value = false; addOk.value = '' }, 1200)
  } catch (e) {
    addErr.value = e.messages?.[0] || e.message || 'Failed'
  }
}

onMounted(() => chatStore.loadContacts())
</script>
