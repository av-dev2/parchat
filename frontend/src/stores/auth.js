import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { frappeRequest } from 'frappe-ui'

async function call(method, args = {}) {
  const res = await frappeRequest({
    url: '/api/method/parchat.api.' + method,
    params: args,
  })
  return res
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)

  async function checkSession() {
    try {
      user.value = await call('get_profile')
    } catch {
      user.value = null
    }
  }

  async function signup(displayName, password) {
    const result = await call('signup', { display_name: displayName, password })
    await checkSession()
    return result
  }

  async function login(loginId, password) {
    const result = await call('login', { login_id: loginId, password })
    // Try to load profile — will fail for non-parchat users, that's OK
    try {
      await checkSession()
    } catch {
      // Non-parchat user, user stays null
    }
    return result
  }

  async function logout() {
    await call('logout')
    user.value = null
  }

  async function updateProfile(data) {
    user.value = await call('update_profile', data)
  }

  return { user, isLoggedIn, checkSession, signup, login, logout, updateProfile }
})

export { call }
