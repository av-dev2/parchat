import './index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import {
  setConfig,
  frappeRequest,
} from 'frappe-ui'

setConfig('resourceFetcher', frappeRequest)

let pinia = createPinia()
let app = createApp(App)

app.use(pinia)
app.use(router)

if (import.meta.env.DEV) {
  frappeRequest({ url: '/api/method/parchat.www.parchat.get_context_for_dev' })
    .then((values) => {
      for (let key in values) {
        window[key] = values[key]
      }
    })
    .catch(() => {
      console.warn('Could not fetch dev context, continuing without boot data')
    })
    .finally(() => {
      app.mount('#app')
    })
} else {
  app.mount('#app')
}
