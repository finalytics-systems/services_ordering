# Copyright (c) 2025, Haris and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from datetime import datetime, timedelta


class ServiceAppointment(Document):
	def validate(self):
		self.validate_appointment_overlap()
	
	def validate_appointment_overlap(self):
		"""Check if there are any overlapping appointments for the selected team"""
		if not self.service_team or not self.appointment_date_time:
			return
		
		# Get appointment date and time
		appointment_datetime = frappe.utils.get_datetime(self.appointment_date_time)
		
		# Create a timespan for the appointment (assume 1 hour duration)
		start_time = appointment_datetime
		end_time = appointment_datetime + timedelta(hours=1)
		
		# Check for overlapping appointments
		existing_appointments = frappe.get_all(
			"Service Appointment",
			filters={
				"service_team": self.service_team,
				"appointment_date_time": ["between", [
					start_time.strftime("%Y-%m-%d %H:%M:%S"),
					end_time.strftime("%Y-%m-%d %H:%M:%S")
				]],
				"docstatus": ["!=", 2],  # Not cancelled
				"name": ["!=", self.name]  # Exclude current appointment
			},
			fields=["name", "appointment_date_time"]
		)
		
		if existing_appointments:
			frappe.throw(
				_("Cannot book this appointment. Team {0} already has an appointment at {1}").format(
					frappe.bold(self.service_team),
					frappe.bold(frappe.utils.format_datetime(self.appointment_date_time))
				),
				title=_("Double Booking Not Allowed")
			)
