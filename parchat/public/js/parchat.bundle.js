/**
 * Parchat — WhatsApp-like Messaging SPA
 * Built with Vue 3 (CDN) inside a Frappe public bundle.
 *
 * This single file contains the entire Vue application:
 *   - Router (hash-based)
 *   - Pages: Signup, Login, ChatList, ChatRoom, AddContact, Profile
 *   - API helpers
 *   - Socket.io integration for real-time messaging
 */

// Load Vue 3 and Vue Router from CDN
(async function () {
	// Inject Vue 3 + Vue Router from CDN
	await loadScript("https://unpkg.com/vue@3/dist/vue.global.prod.js");
	await loadScript("https://unpkg.com/vue-router@4/dist/vue-router.global.prod.js");

	const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } = Vue;
	const { createRouter, createWebHashHistory, useRouter, useRoute } = VueRouter;

	// ─── API Helper ───────────────────────────────────────────
	async function api(method, args = {}) {
		const res = await fetch("/api/method/parchat.api." + method, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Frappe-CSRF-Token": window.csrf_token,
			},
			body: JSON.stringify(args),
		});
		const data = await res.json();
		if (data.exc) {
			let msg = "Error";
			try {
				const parsed = JSON.parse(data.exc);
				msg = parsed[parsed.length - 1] || msg;
			} catch {
				msg = data._server_messages
					? JSON.parse(data._server_messages)[0]
					: data.exc;
			}
			if (typeof msg === "string" && msg.startsWith("{")) {
				try { msg = JSON.parse(msg).message; } catch {}
			}
			throw new Error(msg);
		}
		return data.message;
	}

	// ─── Socket.io ────────────────────────────────────────────
	let socket = null;
	function initSocket() {
		if (typeof io === "undefined") return null;
		const siteName = window.site_name || window.location.hostname;
		const port = window.location.port ? `:${window.location.port}` : "";
		const protocol = window.location.protocol === "https:" ? "https" : "http";
		const url = `${protocol}://${window.location.hostname}${port}/${siteName}`;
		socket = io(url, { withCredentials: true, reconnectionAttempts: 5 });
		return socket;
	}

	// ─── State ────────────────────────────────────────────────
	const state = reactive({
		user: null,       // Chat Profile of logged-in user
		rooms: [],
		contacts: [],
		currentRoom: null,
		messages: [],
		loading: false,
	});

	async function loadProfile() {
		try {
			state.user = await api("get_profile");
		} catch {
			state.user = null;
		}
	}

	// ─── Components ───────────────────────────────────────────

	// --- Signup Page ---
	const SignupPage = {
		template: `
		<div class="auth-page">
			<div class="auth-card">
				<h1>Parchat</h1>
				<p class="tagline">Private. Anonymous. Yours.</p>
				<div v-if="error" class="error-message">{{ error }}</div>
				<div v-if="success" class="success-message">{{ success }}</div>
				<form @submit.prevent="doSignup">
					<div class="form-group">
						<label>Display Name</label>
						<input class="form-input" v-model="displayName" placeholder="Choose a display name" required>
					</div>
					<div class="form-group">
						<label>Password</label>
						<input class="form-input" type="password" v-model="password" placeholder="Create a password" required>
					</div>
					<button class="btn btn-primary btn-block" :disabled="loading" type="submit">
						{{ loading ? 'Creating account...' : 'Sign Up' }}
					</button>
				</form>
				<p class="switch-link">Already have an account? <a href="#/login">Log in</a></p>
			</div>
		</div>
		`,
		setup() {
			const router = useRouter();
			const displayName = ref("");
			const password = ref("");
			const error = ref("");
			const success = ref("");
			const loading = ref(false);

			async function doSignup() {
				error.value = "";
				success.value = "";
				loading.value = true;
				try {
					const result = await api("signup", {
						display_name: displayName.value,
						password: password.value,
					});
					success.value = "Account created! Your UUID: " + result.uuid;
					await loadProfile();
					setTimeout(() => router.push("/chats"), 1500);
				} catch (e) {
					error.value = e.message || "Signup failed";
				}
				loading.value = false;
			}
			return { displayName, password, error, success, loading, doSignup };
		},
	};

	// --- Login Page ---
	const LoginPage = {
		template: `
		<div class="auth-page">
			<div class="auth-card">
				<h1>Parchat</h1>
				<p class="tagline">Welcome back</p>
				<div v-if="error" class="error-message">{{ error }}</div>
				<form @submit.prevent="doLogin">
					<div class="form-group">
						<label>UUID or Email</label>
						<input class="form-input" v-model="loginId" placeholder="Your UUID or generated email" required>
					</div>
					<div class="form-group">
						<label>Password</label>
						<input class="form-input" type="password" v-model="password" placeholder="Your password" required>
					</div>
					<button class="btn btn-primary btn-block" :disabled="loading" type="submit">
						{{ loading ? 'Logging in...' : 'Log In' }}
					</button>
				</form>
				<p class="switch-link">New here? <a href="#/signup">Create an account</a></p>
			</div>
		</div>
		`,
		setup() {
			const router = useRouter();
			const loginId = ref("");
			const password = ref("");
			const error = ref("");
			const loading = ref(false);

			async function doLogin() {
				error.value = "";
				loading.value = true;
				try {
					await api("login", { login_id: loginId.value, password: password.value });
					await loadProfile();
					router.push("/chats");
				} catch (e) {
					error.value = e.message || "Login failed";
				}
				loading.value = false;
			}
			return { loginId, password, error, loading, doLogin };
		},
	};

	// --- Chat List Page ---
	const ChatListPage = {
		template: `
		<div class="app-layout">
			<div class="sidebar" :class="{'hidden-mobile': showChat}">
				<div class="header-bar">
					<h1>Parchat</h1>
					<button class="icon-btn" @click="showAddContact = true" title="Add Contact">➕</button>
					<button class="icon-btn" @click="goProfile" title="Profile">👤</button>
				</div>
				<div class="search-bar">
					<input v-model="search" placeholder="🔍 Search conversations...">
				</div>
				<div class="chat-list">
					<div v-if="filteredRooms.length === 0 && !loading" class="empty-state" style="padding:40px">
						<p>No conversations yet.<br>Add a contact to start chatting!</p>
					</div>
					<div v-for="room in filteredRooms" :key="room.room_id"
						class="chat-item" :class="{active: currentRoomId === room.room_id}"
						@click="openRoom(room)">
						<div class="avatar">
							{{ getInitial(room.other_name) }}
							<span v-if="room.other_online" class="online-dot"></span>
						</div>
						<div class="chat-item-info">
							<div class="chat-item-top">
								<span class="chat-item-name">{{ room.other_name }}</span>
								<span class="chat-item-time">{{ formatTime(room.last_message_at) }}</span>
							</div>
							<div style="display:flex;align-items:center;gap:6px;">
								<span class="chat-item-preview flex-1">{{ room.last_message || 'No messages yet' }}</span>
								<span v-if="room.unread_count" class="unread-badge">{{ room.unread_count }}</span>
							</div>
						</div>
					</div>
				</div>
				<div class="bottom-nav">
					<div class="bottom-nav-items">
						<button class="bottom-nav-item active"><span class="nav-icon">💬</span>Chats</button>
						<button class="bottom-nav-item" @click="showAddContact = true"><span class="nav-icon">➕</span>Add</button>
						<button class="bottom-nav-item" @click="goProfile"><span class="nav-icon">👤</span>Profile</button>
					</div>
				</div>
			</div>
			<div class="main-panel" :class="{'hidden-mobile': !showChat}">
				<template v-if="currentRoomId">
					<div class="header-bar">
						<button class="icon-btn" @click="closeChat" style="display:none" :style="mobileBackStyle">⬅</button>
						<div class="avatar" style="width:36px;height:36px;font-size:0.9rem;">{{ getInitial(currentOther.name) }}</div>
						<h1>{{ currentOther.name }}<br><span class="subtitle" v-if="currentOther.online">online</span></h1>
					</div>
					<div class="messages-container" ref="messagesContainer">
						<div v-for="msg in messages" :key="msg.name"
							class="message-row" :class="msg.sender === profile.name ? 'sent' : 'received'">
							<div class="message-bubble">
								<div>{{ msg.content }}</div>
								<div class="message-meta">
									<span class="message-time">{{ formatMsgTime(msg.timestamp) }}</span>
									<span v-if="msg.sender === profile.name && msg.is_read" class="message-read-tick">✓✓</span>
								</div>
							</div>
						</div>
					</div>
					<div class="message-input-area">
						<input v-model="newMessage" @keyup.enter="sendMsg" placeholder="Type a message..." autofocus>
						<button class="send-btn" @click="sendMsg" :disabled="!newMessage.trim()">➤</button>
					</div>
				</template>
				<div v-else class="empty-state">
					<div class="empty-state-icon">💬</div>
					<h2>Parchat</h2>
					<p>Select a conversation or add a contact to start messaging.</p>
				</div>
			</div>

			<!-- Add Contact Modal -->
			<div v-if="showAddContact" class="modal-overlay" @click.self="showAddContact = false">
				<div class="modal-card">
					<h2>Add Contact</h2>
					<div v-if="addError" class="error-message">{{ addError }}</div>
					<div v-if="addSuccess" class="success-message">{{ addSuccess }}</div>
					<form @submit.prevent="doAddContact">
						<div class="form-group">
							<label>Contact UUID</label>
							<input class="form-input" v-model="contactUuid" placeholder="Paste their UUID here" required>
						</div>
						<div class="form-group">
							<label>Nickname (optional)</label>
							<input class="form-input" v-model="contactAlias" placeholder="Give them a nickname">
						</div>
						<div style="display:flex;gap:8px">
							<button class="btn btn-secondary flex-1" type="button" @click="showAddContact = false">Cancel</button>
							<button class="btn btn-primary flex-1" type="submit" :disabled="addLoading">
								{{ addLoading ? 'Adding...' : 'Add Contact' }}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
		`,
		setup() {
			const router = useRouter();
			const profile = computed(() => state.user || {});
			const search = ref("");
			const loading = ref(false);
			const showChat = ref(false);
			const currentRoomId = ref(null);
			const currentOther = ref({ name: "", online: false });
			const messages = ref([]);
			const newMessage = ref("");
			const messagesContainer = ref(null);
			const showAddContact = ref(false);
			const contactUuid = ref("");
			const contactAlias = ref("");
			const addError = ref("");
			const addSuccess = ref("");
			const addLoading = ref(false);
			let pollInterval = null;

			const filteredRooms = computed(() => {
				const q = search.value.toLowerCase();
				if (!q) return state.rooms;
				return state.rooms.filter(
					(r) => r.other_name?.toLowerCase().includes(q) || r.last_message?.toLowerCase().includes(q)
				);
			});

			const mobileBackStyle = computed(() =>
				window.innerWidth <= 768 ? { display: "flex" } : {}
			);

			function getInitial(name) {
				return name ? name.charAt(0).toUpperCase() : "?";
			}

			function formatTime(dt) {
				if (!dt) return "";
				const d = new Date(dt);
				const now = new Date();
				if (d.toDateString() === now.toDateString()) {
					return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
				}
				return d.toLocaleDateString([], { month: "short", day: "numeric" });
			}

			function formatMsgTime(dt) {
				if (!dt) return "";
				return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
			}

			async function loadRooms() {
				try {
					state.rooms = await api("get_rooms");
				} catch {}
			}

			async function openRoom(room) {
				currentRoomId.value = room.room_id;
				currentOther.value = { name: room.other_name, online: room.other_online };
				showChat.value = true;
				try {
					messages.value = await api("get_messages", { room_id: room.room_id });
					// Mark unread
					await api("mark_read", { room_id: room.room_id });
					room.unread_count = 0;
					await nextTick();
					scrollToBottom();
				} catch {}
			}

			function closeChat() {
				showChat.value = false;
				currentRoomId.value = null;
			}

			function scrollToBottom() {
				const el = messagesContainer.value;
				if (el) el.scrollTop = el.scrollHeight;
			}

			async function sendMsg() {
				const content = newMessage.value.trim();
				if (!content) return;
				newMessage.value = "";
				try {
					const msg = await api("send_message", {
						room_id: currentRoomId.value,
						content,
					});
					messages.value.push(msg);
					await nextTick();
					scrollToBottom();
					await loadRooms();
				} catch {}
			}

			async function doAddContact() {
				addError.value = "";
				addSuccess.value = "";
				addLoading.value = true;
				try {
					await api("add_contact", {
						contact_uuid: contactUuid.value,
						alias_name: contactAlias.value || null,
					});
					addSuccess.value = "Contact added!";
					contactUuid.value = "";
					contactAlias.value = "";
					await loadRooms();
					setTimeout(() => { showAddContact.value = false; addSuccess.value = ""; }, 1200);
				} catch (e) {
					addError.value = e.message || "Failed to add contact";
				}
				addLoading.value = false;
			}

			function goProfile() {
				router.push("/profile");
			}

			// Polling for new messages and room updates
			function startPolling() {
				pollInterval = setInterval(async () => {
					await loadRooms();
					if (currentRoomId.value) {
						try {
							const fresh = await api("get_messages", { room_id: currentRoomId.value });
							if (fresh.length !== messages.value.length) {
								messages.value = fresh;
								await nextTick();
								scrollToBottom();
							}
						} catch {}
					}
				}, 4000);
			}

			// Socket.io for real-time
			function setupSocket() {
				if (!socket) return;
				socket.on("new_message", (data) => {
					if (data.room === currentRoomId.value) {
						const exists = messages.value.find((m) => m.name === data.message.name);
						if (!exists) {
							messages.value.push(data.message);
							nextTick().then(scrollToBottom);
							api("mark_read", { room_id: currentRoomId.value }).catch(() => {});
						}
					}
					loadRooms();
				});
				socket.on("messages_read", (data) => {
					if (data.room === currentRoomId.value) {
						data.messages.forEach((name) => {
							const msg = messages.value.find((m) => m.name === name);
							if (msg) msg.is_read = 1;
						});
					}
				});
			}

			onMounted(async () => {
				loading.value = true;
				await loadRooms();
				loading.value = false;
				startPolling();
				setupSocket();
			});

			onUnmounted(() => {
				if (pollInterval) clearInterval(pollInterval);
			});

			return {
				profile, search, loading, filteredRooms, showChat,
				currentRoomId, currentOther, messages, newMessage, messagesContainer,
				mobileBackStyle, showAddContact, contactUuid, contactAlias,
				addError, addSuccess, addLoading,
				getInitial, formatTime, formatMsgTime,
				openRoom, closeChat, sendMsg, doAddContact, goProfile,
			};
		},
	};

	// --- Profile Page ---
	const ProfilePage = {
		template: `
		<div class="app-layout">
			<div class="sidebar" style="max-width:100%;border:none;">
				<div class="header-bar">
					<button class="icon-btn" @click="goBack">⬅</button>
					<h1>Profile</h1>
					<button class="icon-btn" @click="doLogout" title="Logout">🚪</button>
				</div>
				<div class="profile-page">
					<div class="profile-uuid-box">
						<label>Your UUID — Share this to let others message you</label>
						<div class="uuid-display">{{ profile.uuid }}</div>
						<button class="btn btn-primary" @click="copyUuid">
							{{ copied ? '✓ Copied!' : '📋 Copy UUID' }}
						</button>
					</div>
					<div v-if="error" class="error-message">{{ error }}</div>
					<div v-if="success" class="success-message">{{ success }}</div>
					<form @submit.prevent="saveProfile">
						<div class="form-group">
							<label>Display Name</label>
							<input class="form-input" v-model="displayName">
						</div>
						<div class="form-group">
							<label>Bio</label>
							<input class="form-input" v-model="bio" placeholder="Something about you...">
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
		</div>
		`,
		setup() {
			const router = useRouter();
			const profile = computed(() => state.user || {});
			const displayName = ref("");
			const bio = ref("");
			const error = ref("");
			const success = ref("");
			const saving = ref(false);
			const copied = ref(false);

			onMounted(() => {
				displayName.value = profile.value.display_name || "";
				bio.value = profile.value.bio || "";
			});

			function goBack() {
				router.push("/chats");
			}

			async function copyUuid() {
				try {
					await navigator.clipboard.writeText(profile.value.uuid);
					copied.value = true;
					setTimeout(() => (copied.value = false), 2000);
				} catch {
					// fallback
					const el = document.createElement("textarea");
					el.value = profile.value.uuid;
					document.body.appendChild(el);
					el.select();
					document.execCommand("copy");
					document.body.removeChild(el);
					copied.value = true;
					setTimeout(() => (copied.value = false), 2000);
				}
			}

			async function saveProfile() {
				error.value = "";
				success.value = "";
				saving.value = true;
				try {
					state.user = await api("update_profile", {
						display_name: displayName.value,
						bio: bio.value,
					});
					success.value = "Profile updated!";
					setTimeout(() => (success.value = ""), 2000);
				} catch (e) {
					error.value = e.message || "Failed to save";
				}
				saving.value = false;
			}

			async function doLogout() {
				try {
					await api("logout");
				} catch {}
				state.user = null;
				window.location.href = "/parchat#/login";
				window.location.reload();
			}

			return { profile, displayName, bio, error, success, saving, copied, goBack, copyUuid, saveProfile, doLogout };
		},
	};

	// --- Loading Page ---
	const LoadingPage = {
		template: `<div class="loading-page"><div class="spinner"></div></div>`,
	};

	// ─── Router ───────────────────────────────────────────────
	const routes = [
		{ path: "/", redirect: "/chats" },
		{ path: "/signup", component: SignupPage },
		{ path: "/login", component: LoginPage },
		{ path: "/chats", component: ChatListPage },
		{ path: "/profile", component: ProfilePage },
	];

	const router = createRouter({
		history: createWebHashHistory(),
		routes,
	});

	// Guard: redirect to login/signup if not authenticated
	router.beforeEach(async (to, from, next) => {
		const publicPages = ["/signup", "/login"];
		if (!state.user && !publicPages.includes(to.path)) {
			await loadProfile();
			if (!state.user) {
				return next("/signup");
			}
		}
		next();
	});

	// ─── Mount App ────────────────────────────────────────────
	const app = createApp({
		template: `<router-view />`,
	});
	app.use(router);

	// Init socket
	initSocket();

	// Try loading profile before mounting
	await loadProfile();

	app.mount("#app");
})();

// ─── Utility: Load script via <script> tag ─────────────────
function loadScript(src) {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve();
			return;
		}
		const s = document.createElement("script");
		s.src = src;
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild(s);
	});
}
