<template>
  <div style="display: flex; flex-direction: column; height: 100%">
    <div class="header-bar">
      <button class="icon-btn" @click="$router.push('/chats')">⬅</button>
      <h1>Profile</h1>
      <button class="icon-btn" @click="doLogout" title="Log out">🚪</button>
    </div>
    <div class="profile-page" style="overflow-y: auto; flex: 1">
      <div class="profile-uuid-box">
        <label>Your UUID — Share this to let others message you</label>
        <div class="uuid-display">{{ auth.user?.uuid }}</div>
        <button class="btn btn-primary" @click="copyUuid">
          {{ copied ? '✓ Copied!' : '📋 Copy UUID' }}
        </button>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="success" class="success-message">{{ success }}</div>
      <form @submit.prevent="saveProfile">
        <div class="form-group">
          <label>Display Name</label>
          <input class="form-input" v-model="displayName" />
        </div>
        <div class="form-group">
          <label>Bio</label>
          <input class="form-input" v-model="bio" placeholder="Something about you..." />
        </div>
        <button class="btn btn-primary btn-block" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </form>
      <div class="mt-4">
        <button class="btn btn-danger btn-block" @click="doLogout">Log Out</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const displayName = ref('')
const bio = ref('')
const error = ref('')
const success = ref('')
const saving = ref(false)
const copied = ref(false)

onMounted(() => {
  displayName.value = auth.user?.display_name || ''
  bio.value = auth.user?.bio || ''
})

async function copyUuid() {
  try {
    await navigator.clipboard.writeText(auth.user?.uuid)
  } catch {
    const el = document.createElement('textarea')
    el.value = auth.user?.uuid || ''
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function saveProfile() {
  error.value = ''
  success.value = ''
  saving.value = true
  try {
    await auth.updateProfile({ display_name: displayName.value, bio: bio.value })
    success.value = 'Profile updated!'
    setTimeout(() => (success.value = ''), 2000)
  } catch (e) {
    error.value = e.messages?.[0] || e.message || 'Failed to save'
  }
  saving.value = false
}

async function doLogout() {
  await auth.logout()
  window.location.href = '/parchat/login'
}
</script>
