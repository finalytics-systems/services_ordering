# Copyright (c) 2025, Haris and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from datetime import datetime, timedelta


class ServiceAppointment(Document):
	def validate(self):
		self.validate_appointment_overlap()

	def on_submit(self):
		if self.sales_order:
			self.update_sales_order_status()
		self.send_confirmation_email()

	def update_sales_order_status(self):
		"""Update the sales order status to "In Progress" if it exists"""
		if self.sales_order:
			sales_order = frappe.get_doc("Sales Order", self.sales_order)
			sales_order.custom_appointment_ref = self.name
			sales_order.save()
	
	def send_confirmation_email(self):
		"""Send a confirmation email to the customer about their appointment booking"""
		if not self.email:
			frappe.msgprint(_("No email address found for customer. Cannot send confirmation email."))
			return
		
		# Format appointment date and time
		appointment_datetime = frappe.utils.format_datetime(self.appointment_date_time)
		appointment_end_datetime = frappe.utils.format_datetime(self.appointment_end_time) if self.appointment_end_time else ""
		
		# Get customer name
		customer_name = self.customer_name if hasattr(self, 'customer_name') else self.customer
		
		# Prepare email content
		subject = _("Appointment Confirmation - Your Service Has Been Booked")
		
		message = f"""
		<p>Dear {customer_name},</p>
		
		<p>We are pleased to confirm that your service appointment has been successfully booked!</p>
		
		<p><strong>Appointment Details:</strong></p>
		<ul>
			<li><strong>Service Team:</strong> {self.service_team}</li>
			<li><strong>Appointment Date & Time:</strong> {appointment_datetime}</li>
			{f'<li><strong>Expected End Time:</strong> {appointment_end_datetime}</li>' if appointment_end_datetime else ''}
			<li><strong>Total Service Time:</strong> {self.total_service_time} hours</li>
		</ul>
		
		<p>Our team will arrive at the scheduled time to provide you with excellent service.</p>
		
		<p>If you need to reschedule or have any questions, please contact us at your earliest convenience.</p>
		
		<p>Thank you for choosing our services!</p>
		
		<p>Best regards,<br>
		Services Team</p>
		"""
		
		try:
			frappe.sendmail(
				recipients=[self.email],
				subject=subject,
				message=message,
				header=[_("Appointment Confirmation"), "green"]
			)
			frappe.msgprint(_("Appointment confirmation email sent successfully to {0}").format(self.email))
		except Exception as e:
			frappe.log_error(f"Failed to send appointment confirmation email: {str(e)}")
			frappe.msgprint(_("Failed to send confirmation email. Please check the email address and try again."))
	
	
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


@frappe.whitelist()
def get_paid_sales_orders(doctype, txt, searchfield, start, page_len, filters):
	"""
	Query function to return only sales orders that have payment entries against them.
	This is used to filter the sales_order Link field in Service Appointment.
	"""
	return frappe.db.sql("""
		SELECT DISTINCT so.name, so.customer_name, so.transaction_date, so.grand_total
		FROM `tabSales Order` so
		INNER JOIN `tabPayment Entry Reference` per 
			ON per.reference_name = so.name 
			AND per.reference_doctype = 'Sales Order'
		INNER JOIN `tabPayment Entry` pe 
			ON pe.name = per.parent 
			AND pe.docstatus = 1
		WHERE 
			so.docstatus = 1
			AND (
				so.name LIKE %(txt)s 
				OR so.customer_name LIKE %(txt)s
			)
		ORDER BY so.transaction_date DESC
		LIMIT %(start)s, %(page_len)s
	""", {
		'txt': f'%{txt}%',
		'start': start,
		'page_len': page_len
	})
