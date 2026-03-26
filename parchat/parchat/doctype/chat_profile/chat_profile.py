import uuid as _uuid

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class ChatProfile(Document):
	def before_insert(self):
		if not self.uuid:
			self.uuid = str(_uuid.uuid4())
		if not self.last_seen:
			self.last_seen = now_datetime()

	def before_save(self):
		self.last_seen = now_datetime()
