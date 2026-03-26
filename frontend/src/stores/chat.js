import { defineStore } from 'pinia'
import { ref } from 'vue'
import { call } from './auth'

export const useChatStore = defineStore('chat', () => {
  const rooms = ref([])
  const contacts = ref([])
  const messages = ref([])
  const currentRoomId = ref(null)

  async function loadRooms() {
    rooms.value = await call('get_rooms')
  }

  async function loadContacts() {
    contacts.value = await call('get_contacts')
  }

  async function loadMessages(roomId, limit = 50, offset = 0) {
    messages.value = await call('get_messages', { room_id: roomId, limit, offset })
  }

  async function sendMessage(roomId, content) {
    const msg = await call('send_message', { room_id: roomId, content })
    messages.value.push(msg)
    await loadRooms()
    return msg
  }

  async function markRead(roomId) {
    await call('mark_read', { room_id: roomId })
    const room = rooms.value.find(r => r.room_id === roomId)
    if (room) room.unread_count = 0
  }

  async function addContact(contactUuid, aliasName = null) {
    return await call('add_contact', { contact_uuid: contactUuid, alias_name: aliasName })
  }

  return {
    rooms, contacts, messages, currentRoomId,
    loadRooms, loadContacts, loadMessages, sendMessage, markRead, addContact,
  }
})
