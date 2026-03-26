<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Parchat</h1>
      <p class="tagline">Welcome back</p>
      <div v-if="error" class="error-message">{{ error }}</div>
      <form @submit.prevent="doLogin">
        <div class="form-group">
          <label>Username or Email</label>
          <input class="form-input" v-model="loginId" placeholder="Username or Email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" type="password" v-model="password" placeholder="Password" required />
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
    const result = await auth.login(loginId.value, password.value)

    // Parchat users go to chats, others go to desk
    if (result && result.is_parchat_user) {
      router.push('/chats')
    } else {
      window.location.href = '/app'
    }
  } catch (e) {
    error.value = e.messages?.[0] || e.message || 'Login failed'
  }
  loading.value = false
}
</script>
