<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Parchat</h1>
      <p class="tagline">Welcome back</p>
      <div v-if="error" class="error-message">{{ error }}</div>
      <form @submit.prevent="doLogin">
        <div class="form-group">
          <label>UUID or Email</label>
          <input class="form-input" v-model="loginId" placeholder="Your UUID or generated email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" type="password" v-model="password" placeholder="Your password" required />
        </div>
        <button class="btn btn-primary btn-block" :disabled="loading" type="submit">
          {{ loading ? 'Logging in...' : 'Log In' }}
        </button>
      </form>
      <p class="switch-link">
        New here?
        <router-link to="/signup">Create an account</router-link>
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
const loginId = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function doLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(loginId.value, password.value)
    router.push('/chats')
  } catch (e) {
    error.value = e.messages?.[0] || e.message || 'Login failed'
  }
  loading.value = false
}
</script>
