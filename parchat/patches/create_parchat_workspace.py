import frappe
import json


def execute():
	"""Create non-standard Parchat workspace with shortcuts and links to all Parchat doctypes."""

	if frappe.db.exists("Workspace", {"label": "Parchat"}):
		return

	# Content blocks for the workspace page layout
	content = json.dumps([
		{
			"id": "parchat_header_1",
			"type": "header",
			"data": {
				"text": '<span style="font-size: 18px;"><b>Parchat - Anonymous Messaging</b></span>',
				"col": 12,
			},
		},
		{
			"id": "parchat_shortcut_1",
			"type": "shortcut",
			"data": {"shortcut_name": "Chat Profile", "col": 4},
		},
		{
			"id": "parchat_shortcut_2",
			"type": "shortcut",
			"data": {"shortcut_name": "Chat Room", "col": 4},
		},
		{
			"id": "parchat_shortcut_3",
			"type": "shortcut",
			"data": {"shortcut_name": "Chat Message", "col": 4},
		},
		{
			"id": "parchat_spacer_1",
			"type": "spacer",
			"data": {"col": 12},
		},
		{
			"id": "parchat_header_2",
			"type": "header",
			"data": {
				"text": '<span style="font-size: 18px;"><b>Manage</b></span>',
				"col": 12,
			},
		},
		{
			"id": "parchat_card_1",
			"type": "card",
			"data": {"card_name": "Users & Profiles", "col": 4},
		},
		{
			"id": "parchat_card_2",
			"type": "card",
			"data": {"card_name": "Messaging", "col": 4},
		},
	])

	workspace = frappe.get_doc({
		"doctype": "Workspace",
		"label": "Parchat",
		"title": "Parchat",
		"icon": "chat",
		"module": "Parchat",
		"public": 1,
		"is_standard": 0,
		"content": content,
		"shortcuts": [
			{
				"label": "Chat Profile",
				"link_to": "Chat Profile",
				"type": "DocType",
				"doc_view": "List",
				"color": "Green",
			},
			{
				"label": "Chat Room",
				"link_to": "Chat Room",
				"type": "DocType",
				"doc_view": "List",
				"color": "Blue",
			},
			{
				"label": "Chat Message",
				"link_to": "Chat Message",
				"type": "DocType",
				"doc_view": "List",
				"color": "Orange",
			},
		],
		"links": [
			{
				"label": "Users & Profiles",
				"type": "Card Break",
				"link_type": "DocType",
				"hidden": 0,
				"link_count": 2,
			},
			{
				"label": "Chat Profile",
				"link_to": "Chat Profile",
				"link_type": "DocType",
				"type": "Link",
				"hidden": 0,
			},
			{
				"label": "Chat Contact",
				"link_to": "Chat Contact",
				"link_type": "DocType",
				"type": "Link",
				"hidden": 0,
			},
			{
				"label": "Messaging",
				"type": "Card Break",
				"link_type": "DocType",
				"hidden": 0,
				"link_count": 2,
			},
			{
				"label": "Chat Room",
				"link_to": "Chat Room",
				"link_type": "DocType",
				"type": "Link",
				"hidden": 0,
			},
			{
				"label": "Chat Message",
				"link_to": "Chat Message",
				"link_type": "DocType",
				"type": "Link",
				"hidden": 0,
			},
		],
	})

	workspace.flags.ignore_permissions = True
	workspace.insert()
	frappe.db.commit()
