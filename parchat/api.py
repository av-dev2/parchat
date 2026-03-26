import frappe
from frappe import _
from frappe.utils import now_datetime
import uuid as _uuid
import json as _json


def get_current_profile_name():
	"""Get the Chat Profile name for the currently logged-in user."""
	return frappe.db.get_value("Chat Profile", {"user": frappe.session.user}, "name")


@frappe.whitelist(allow_guest=True)
def signup(display_name, password):
	"""Anonymous signup: generate random email, create User + Chat Profile."""
	if not display_name or not password:
		frappe.throw(_("Display name and password are required"))

	random_id = frappe.generate_hash(length=8)
	email = f"usr_{random_id}@parchat.local"

	user = frappe.get_doc({
		"doctype": "User",
		"email": email,
		"first_name": display_name,
		"new_password": password,
		"send_welcome_email": 0,
		"user_type": "Website User",
	})
	user.flags.ignore_permissions = True
	user.flags.ignore_password_policy = True
	user.insert()

	profile_uuid = str(_uuid.uuid4())
	profile = frappe.get_doc({
		"doctype": "Chat Profile",
		"user": user.name,
		"uuid": profile_uuid,
		"display_name": display_name,
	})
	profile.flags.ignore_permissions = True
	profile.insert()

	frappe.db.commit()

	# Auto-login
	from frappe.auth import LoginManager
	login_manager = LoginManager()
	login_manager.authenticate(email, password)
	login_manager.post_login()

	return {
		"success": True,
		"uuid": profile.uuid,
		"email": email,
		"display_name": display_name,
	}


@frappe.whitelist(allow_guest=True)
def login(login_id, password):
	"""Login via UUID or generated email."""
	from frappe.auth import LoginManager

	email = login_id
	# If login_id looks like a UUID, resolve it to email
	if "@" not in login_id:
		user = frappe.db.get_value("Chat Profile", {"uuid": login_id}, "user")
		if user:
			email = user
		else:
			frappe.throw(_("Invalid UUID"), frappe.AuthenticationError)

	try:
		login_manager = LoginManager()
		login_manager.authenticate(email, password)
		login_manager.post_login()
		return {"success": True}
	except frappe.AuthenticationError:
		frappe.throw(_("Invalid credentials"), frappe.AuthenticationError)


@frappe.whitelist()
def logout():
	"""Logout the current user."""
	frappe.local.login_manager.logout()
	return {"success": True}


@frappe.whitelist()
def get_profile():
	"""Return the current user's Chat Profile."""
	profile_name = get_current_profile_name()
	if not profile_name:
		frappe.throw(_("Profile not found"))

	profile = frappe.get_doc("Chat Profile", profile_name)
	return {
		"name": profile.name,
		"uuid": profile.uuid,
		"display_name": profile.display_name,
		"bio": profile.bio,
		"avatar_url": profile.avatar_url,
	}


@frappe.whitelist()
def update_profile(display_name=None, bio=None, avatar_url=None):
	"""Update the current user's profile fields."""
	profile_name = get_current_profile_name()
	if not profile_name:
		frappe.throw(_("Profile not found"))

	profile = frappe.get_doc("Chat Profile", profile_name)
	if display_name:
		profile.display_name = display_name
	if bio is not None:
		profile.bio = bio
	if avatar_url is not None:
		profile.avatar_url = avatar_url

	profile.save(ignore_permissions=True)
	return get_profile()


@frappe.whitelist()
def add_contact(contact_uuid, alias_name=None):
	"""Add a contact by UUID. Creates Chat Contact + Chat Room."""
	owner_name = get_current_profile_name()
	if not owner_name:
		frappe.throw(_("Profile not found"))

	contact_profile_name = frappe.db.get_value("Chat Profile", {"uuid": contact_uuid}, "name")
	if not contact_profile_name:
		frappe.throw(_("No user found with that UUID"))

	if contact_profile_name == owner_name:
		frappe.throw(_("You cannot add yourself as a contact"))

	exists = frappe.db.exists("Chat Contact", {
		"owner_profile": owner_name,
		"contact_profile": contact_profile_name,
	})
	if exists:
		frappe.throw(_("Contact already exists"))

	contact_profile = frappe.get_doc("Chat Profile", contact_profile_name)

	contact = frappe.get_doc({
		"doctype": "Chat Contact",
		"owner_profile": owner_name,
		"contact_profile": contact_profile_name,
		"contact_uuid": contact_profile.uuid,
		"display_name": alias_name or contact_profile.display_name,
		"added_on": now_datetime(),
	})
	contact.insert(ignore_permissions=True)

	# Deterministic room_id from sorted profile names
	sorted_profiles = sorted([owner_name, contact_profile_name])
	room_id = f"{sorted_profiles[0]}---{sorted_profiles[1]}"

	if not frappe.db.exists("Chat Room", room_id):
		room = frappe.get_doc({
			"doctype": "Chat Room",
			"room_id": room_id,
			"participant_1": sorted_profiles[0],
			"participant_2": sorted_profiles[1],
			"created_at": now_datetime(),
		})
		room.insert(ignore_permissions=True)

	return {"success": True, "room_id": room_id, "contact": contact.name}


@frappe.whitelist()
def get_contacts():
	"""Return the current user's contact list."""
	owner_name = get_current_profile_name()
	if not owner_name:
		return []

	contacts = frappe.get_all(
		"Chat Contact",
		filters={"owner_profile": owner_name},
		fields=["name", "contact_profile", "contact_uuid", "display_name", "added_on"],
		order_by="display_name asc",
	)
	return contacts


@frappe.whitelist()
def get_rooms():
	"""Return all chat rooms for the current user with last message preview."""
	profile_name = get_current_profile_name()
	if not profile_name:
		return []

	rooms = frappe.db.sql(
		"""
		SELECT
			r.name, r.room_id, r.participant_1, r.participant_2,
			r.last_message, r.last_message_at,
			p1.display_name as p1_name, p2.display_name as p2_name,
			p1.avatar_url as p1_avatar, p2.avatar_url as p2_avatar,
			p1.is_online as p1_online, p2.is_online as p2_online,
			p1.uuid as p1_uuid, p2.uuid as p2_uuid
		FROM `tabChat Room` r
		JOIN `tabChat Profile` p1 ON p1.name = r.participant_1
		JOIN `tabChat Profile` p2 ON p2.name = r.participant_2
		WHERE r.participant_1 = %s OR r.participant_2 = %s
		ORDER BY COALESCE(r.last_message_at, r.created_at) DESC
		""",
		(profile_name, profile_name),
		as_dict=True,
	)

	for r in rooms:
		if r.participant_1 == profile_name:
			r["other_name"] = r.p2_name
			r["other_avatar"] = r.p2_avatar
			r["other_online"] = r.p2_online
			r["other_uuid"] = r.p2_uuid
			r["other_id"] = r.participant_2
		else:
			r["other_name"] = r.p1_name
			r["other_avatar"] = r.p1_avatar
			r["other_online"] = r.p1_online
			r["other_uuid"] = r.p1_uuid
			r["other_id"] = r.participant_1

		# Count unread messages
		r["unread_count"] = frappe.db.count("Chat Message", {
			"room": r.room_id,
			"sender": ["!=", profile_name],
			"is_read": 0,
		})

	return rooms


@frappe.whitelist()
def get_messages(room_id, limit=50, offset=0):
	"""Return paginated messages for a room (chronological order)."""
	profile_name = get_current_profile_name()
	room = frappe.get_doc("Chat Room", room_id)
	if profile_name not in [room.participant_1, room.participant_2]:
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	messages = frappe.get_all(
		"Chat Message",
		filters={"room": room_id},
		fields=["name", "sender", "content", "message_type", "timestamp", "is_read", "read_at"],
		order_by="timestamp desc",
		limit=int(limit),
		start=int(offset),
	)
	return list(reversed(messages))


@frappe.whitelist()
def send_message(room_id, content, message_type="text"):
	"""Send a message to a chat room."""
	profile_name = get_current_profile_name()
	room = frappe.get_doc("Chat Room", room_id)
	if profile_name not in [room.participant_1, room.participant_2]:
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	msg = frappe.get_doc({
		"doctype": "Chat Message",
		"room": room_id,
		"sender": profile_name,
		"content": content,
		"message_type": message_type,
	})
	msg.insert(ignore_permissions=True)

	# Update room preview
	preview = content[:100] + ("..." if len(content) > 100 else "")
	frappe.db.set_value("Chat Room", room_id, {
		"last_message": preview,
		"last_message_at": msg.timestamp,
	})

	# Real-time push
	frappe.publish_realtime(
		"new_message",
		{
			"room": room_id,
			"message": {
				"name": msg.name,
				"sender": msg.sender,
				"content": msg.content,
				"message_type": msg.message_type,
				"timestamp": str(msg.timestamp),
				"is_read": 0,
			},
		},
		after_commit=True,
	)

	return {
		"name": msg.name,
		"sender": msg.sender,
		"content": msg.content,
		"message_type": msg.message_type,
		"timestamp": str(msg.timestamp),
		"is_read": 0,
	}


@frappe.whitelist()
def mark_read(room_id, message_names=None):
	"""Mark messages as read in a room."""
	profile_name = get_current_profile_name()
	room = frappe.get_doc("Chat Room", room_id)
	if profile_name not in [room.participant_1, room.participant_2]:
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if message_names and isinstance(message_names, str):
		message_names = _json.loads(message_names)

	now = now_datetime()

	if message_names:
		names_to_mark = message_names
	else:
		# Mark all unread messages in the room not sent by current user
		names_to_mark = frappe.get_all(
			"Chat Message",
			filters={
				"room": room_id,
				"sender": ["!=", profile_name],
				"is_read": 0,
			},
			pluck="name",
		)

	marked = []
	for name in names_to_mark:
		frappe.db.set_value("Chat Message", name, {"is_read": 1, "read_at": now})
		marked.append(name)

	if marked:
		frappe.publish_realtime(
			"messages_read",
			{"room": room_id, "messages": marked, "reader": profile_name},
			after_commit=True,
		)

	return {"marked": len(marked)}
