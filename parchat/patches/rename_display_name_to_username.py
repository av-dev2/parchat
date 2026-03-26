import frappe


def execute():
	"""Rename display_name column to username in Chat Profile and Chat Contact."""
	# Rename column in Chat Profile
	if frappe.db.has_column("Chat Profile", "display_name"):
		frappe.db.sql("""
			ALTER TABLE `tabChat Profile`
			CHANGE COLUMN `display_name` `username` varchar(140)
		""")

	# Rename column in Chat Contact
	if frappe.db.has_column("Chat Contact", "display_name"):
		frappe.db.sql("""
			ALTER TABLE `tabChat Contact`
			CHANGE COLUMN `display_name` `username` varchar(140)
		""")

	frappe.db.commit()
