import frappe
from frappe.utils import get_system_timezone

no_cache = 1


def get_context(context):
	context.boot = get_boot()
	context.no_cache = 1
	return context


@frappe.whitelist(methods=["POST", "GET"], allow_guest=True)
def get_context_for_dev():
	if not frappe.conf.developer_mode:
		frappe.throw("This method is only meant for developer mode")
	return get_boot()


def get_boot():
	return frappe._dict(
		{
			"csrf_token": frappe.sessions.get_csrf_token(),
			"site_name": frappe.local.site,
			"timezone": get_system_timezone(),
		}
	)
