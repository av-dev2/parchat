<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Parchat</h1>
      <p class="tagline">Private. Anonymous. Yours.</p>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="success" class="success-message">
        Account created! Your UUID:<br>
        <strong>{{ savedUuid }}</strong><br>
        <small>Save this — it's your login ID.</small>
      </div>
      <form @submit.prevent="doSignup">
        <div class="form-group">
          <label>Username</label>
          <input class="form-input" v-model="displayName" placeholder="Username" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" type="password" v-model="password" placeholder="Password" required />
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading" type="submit">
          {{ loading ? 'Creating account...' : 'Sign Up' }}
        </button>
      </form>
      <p class="switch-link">
        Already have an account?
        <router-link to="/login">Log in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const displayName = ref('')
const password = ref('')
const error = ref('')
const success = ref(false)
const savedUuid = ref('')
const loading = ref(false)

async function doSignup() {
  error.value = ''
  success.value = false
  loading.value = true
  try {
    const result = await auth.signup(displayName.value, password.value)
    savedUuid.value = result.uuid
    success.value = true
    setTimeout(() => router.push('/chats'), 2000)
  } catch (e) {
    error.value = e.messages?.[0] || e.message || 'Signup failed'
  }
  loading.value = false
}
</script>
