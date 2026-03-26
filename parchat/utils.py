import frappe


def redirect_after_login():
	"""After login hook: set redirect based on whether the user is a Parchat user."""
	user = frappe.session.user

	# Administrator always goes to desk
	if user == "Administrator":
		frappe.local.response["home_page"] = "/app"
		return

	# Check if the user has a Chat Profile (i.e., they are a Parchat user)
	has_profile = frappe.db.exists("Chat Profile", {"user": user})

	if has_profile:
		frappe.local.response["home_page"] = "/parchat/chats"
	else:
		frappe.local.response["home_page"] = "/app"
