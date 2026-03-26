import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/pages/Signup.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
  },
  {
    path: '/chats',
    name: 'Chats',
    component: () => import('@/pages/ChatList.vue'),
  },
  {
    path: '/chats/:roomId',
    name: 'ChatRoom',
    component: () => import('@/pages/ChatRoom.vue'),
    props: true,
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: () => import('@/pages/Contacts.vue'),
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/Profile.vue'),
  },
]

let router = createRouter({
  history: createWebHistory('/parchat'),
  routes,
})

const publicPages = ['Signup', 'Login']
const protectedPages = ['Chats', 'ChatRoom', 'Contacts', 'Profile']

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()

  // If navigating to a protected page and not logged in, check session first
  if (!auth.isLoggedIn && protectedPages.includes(to.name)) {
    await auth.checkSession()
    if (!auth.isLoggedIn) {
      return next({ name: 'Login' })
    }
  }

  // If logged in and trying to visit login/signup, redirect to chats
  if (auth.isLoggedIn && publicPages.includes(to.name)) {
    return next({ name: 'Chats' })
  }

  next()
})

export default router
