import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/chats',
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

router.beforeEach(async (to, from, next) => {
  const publicPages = ['Signup', 'Login']
  const auth = useAuthStore()

  if (!auth.isLoggedIn && !publicPages.includes(to.name)) {
    await auth.checkSession()
    if (!auth.isLoggedIn) {
      return next({ name: 'Signup' })
    }
  }
  next()
})

export default router
