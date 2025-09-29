// Copyright (c) 2025, Haris and contributors
// For license information, please see license.txt

frappe.ui.form.on("Service Appointment", {
	refresh(frm) {
		// Initialize the calendar view if team is already selected
		if (frm.doc.service_team) {
			display_team_availability(frm);
		}
	},
	
	service_team: function(frm) {
		// Update calendar view when team is selected
		if (frm.doc.service_team) {
			display_team_availability(frm);
		} else {
			frm.fields_dict.team_availability.$wrapper.html('');
		}
	},
	
	appointment_date_time: function(frm) {
		// Refresh the calendar view when date/time changes
		if (frm.doc.service_team && frm.doc.appointment_date_time) {
			display_team_availability(frm);
		}
	}
});

// Function to display team availability in calendar view
function display_team_availability(frm) {
	// Clear previous content
	frm.fields_dict.team_availability.$wrapper.html(
		'<div class="text-center p-4"><div class="loading-spinner"></div><p class="text-muted mt-2">Loading team schedule...</p></div>'
	);
	
	// Get the selected team information
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Cleaning Team",
			name: frm.doc.service_team
		},
		callback: function(response) {
			if (response.message) {
				const team = response.message;
				
				// Get existing appointments for this team
				frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Service Appointment",
						filters: {
							service_team: frm.doc.service_team,
							docstatus: ["!=", 2], // Not cancelled
							name: ["!=", frm.doc.name || ""] // Exclude current appointment
						},
						fields: ["appointment_date_time", "name", "customer"]
					},
					callback: function(appointments_response) {
						const appointments = appointments_response.message || [];
						try {
							render_calendar_view(frm, team, appointments);
						} catch (error) {
							console.error("Error rendering calendar:", error);
							frm.fields_dict.team_availability.$wrapper.html(
								'<div class="alert alert-danger">Error rendering calendar: ' + error.message + '</div>'
							);
						}
					}
				});
			} else {
				frm.fields_dict.team_availability.$wrapper.html(
					'<div class="alert alert-warning">Could not load team information</div>'
				);
			}
		}
	});
}

// Function to render calendar view
function render_calendar_view(frm, team, appointments) {
	// Get team's duty hours
	const duty_start = team.duty_start_time || "09:00:00";
	const duty_end = team.duty_end_time || "17:00:00";
	
	// Format times for display
	const start_hour = parseInt(duty_start.split(':')[0]);
	const end_hour = parseInt(duty_end.split(':')[0]);
	
	// Get selected date (from appointment or today)
	const selected_date = frm.doc.appointment_date_time ? 
		new Date(frm.doc.appointment_date_time) : new Date();
	
	// Format the date for display and selection
	const date_yyyy_mm_dd = selected_date.toISOString().split('T')[0];
	const formatted_date = selected_date.toLocaleDateString(undefined, { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	});
	
	// Start building HTML
	let html = `
		<div class="team-schedule-container">
			<div class="summary-section">
				<div class="summary-card">
					<div class="summary-icon">👥</div>
					<div class="summary-content">
						<div class="summary-label">Team</div>
						<div class="summary-value">${team.name1}</div>
					</div>
				</div>
				<div class="summary-card">
					<div class="summary-icon">⏰</div>
					<div class="summary-content">
						<div class="summary-label">Duty Hours</div>
						<div class="summary-value">${format_time(duty_start)} - ${format_time(duty_end)}</div>
					</div>
				</div>
				<div class="summary-card">
					<div class="summary-icon">📅</div>
					<div class="summary-content">
						<div class="summary-label">Members</div>
						<div class="summary-value">${(team.team_members && team.team_members.length) || 0} members</div>
					</div>
				</div>
			</div>
		
			<div class="schedule-header">
				<div class="team-info">
					<h5 class="team-name">Schedule for ${team.name1}</h5>
				</div>
				<div class="date-selector">
					<input type="date" class="date-picker form-control" value="${date_yyyy_mm_dd}">
				</div>
			</div>
			
			<div class="date-display">
				<span class="selected-date">${formatted_date}</span>
			</div>
			
			<div class="calendar-view">
				<div class="time-slots">
	`;
	
	// Create time slots for the day (hourly)
	for (let hour = start_hour; hour <= end_hour; hour++) {
		const time_string = `${hour.toString().padStart(2, '0')}:00`;
		const is_booked = is_time_slot_booked(appointments, hour, selected_date);
		const slot_class = is_booked ? 'booked' : 'available';
		const is_current_selection = selected_date.getHours() === hour ? 'selected' : '';
		
		html += `
			<div class="time-slot ${slot_class} ${is_current_selection}" data-hour="${hour}">
				<div class="time-info">
					<div class="time">${format_time(time_string)}</div>
					<div class="status-indicator">
						<span class="status-circle"></span>
						<span class="status-text">${is_booked ? 'Booked' : 'Available'}</span>
					</div>
				</div>
				${is_booked ? get_appointment_details(appointments, hour, selected_date) : ''}
				${!is_booked ? '<div class="book-now-prompt">Available for booking</div>' : ''}
			</div>
		`;
	}
	
	html += `
				</div>
			</div>
			
			<div class="legend-container">
				<div class="legend-item available-legend">
					<span class="status-circle available"></span>
					<span>Available</span>
				</div>
				<div class="legend-item booked-legend">
					<span class="status-circle booked"></span>
					<span>Booked</span>
				</div>
			</div>
		</div>
	`;
	
	// Add custom CSS
	html += `
		<style>
			.team-schedule-container {
				font-family: var(--font-stack, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif);
				background-color: #fff;
				border-radius: 8px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				margin: 15px 0;
				overflow: hidden;
			}
			
			.summary-section {
				display: flex;
				justify-content: space-between;
				padding: 15px 20px;
				background-color: #f8f9fa;
				border-bottom: 1px solid #eee;
				flex-wrap: wrap;
			}
			
			.summary-card {
				display: flex;
				align-items: center;
				padding: 10px;
				min-width: 200px;
				flex: 1;
			}
			
			.summary-icon {
				font-size: 24px;
				margin-right: 12px;
				width: 40px;
				height: 40px;
				display: flex;
				align-items: center;
				justify-content: center;
				background-color: rgba(75, 108, 183, 0.1);
				border-radius: 50%;
				color: #4b6cb7;
			}
			
			.summary-label {
				font-size: 0.8rem;
				color: #6c757d;
				margin-bottom: 2px;
			}
			
			.summary-value {
				font-weight: 500;
				color: #343a40;
			}
			
			.schedule-header {
				background: linear-gradient(to right, #F3D211, #F3D211);
				color: #fff;
				padding: 15px 20px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				flex-wrap: wrap;
			}
			
			.team-name {
				margin: 0;
				font-weight: 600;
				font-size: 1.1rem;
			}
			
			.date-selector {
				min-width: 200px;
			}
			
			.date-picker {
				background-color: rgba(255,255,255,0.15);
				border: 1px solid rgba(255,255,255,0.3);
				border-radius: 4px;
				color: white;
				font-weight: 500;
				padding: 5px 10px;
			}
			
			.date-picker:focus {
				outline: none;
				border-color: rgba(255,255,255,0.6);
			}
			
			.date-display {
				background: #f8f9fa;
				padding: 10px 20px;
				border-bottom: 1px solid #eee;
				font-size: 1rem;
				font-weight: 500;
				color: #343a40;
				text-align: center;
			}
			
			.calendar-view {
				padding: 15px;
			}
			
			.time-slots {
				display: flex;
				flex-direction: column;
				gap: 10px;
			}
			
			.time-slot {
				background-color: #fff;
				border-radius: 6px;
				padding: 15px;
				display: flex;
				flex-direction: column;
				transition: all 0.2s ease;
				box-shadow: 0 1px 3px rgba(0,0,0,0.08);
				border-left: 4px solid transparent;
				cursor: pointer;
			}
			
			.time-slot.available {
				border-left-color: #28a745;
			}
			
			.time-slot.booked {
				border-left-color: #dc3545;
				cursor: not-allowed;
			}
			
			.time-slot:hover {
				box-shadow: 0 3px 8px rgba(0,0,0,0.12);
				transform: translateY(-2px);
			}
			
			.time-info {
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			
			.time {
				font-weight: 600;
				font-size: 1rem;
			}
			
			.status-indicator {
				display: flex;
				align-items: center;
				gap: 5px;
				font-size: 0.85rem;
				padding: 4px 10px;
				border-radius: 12px;
			}
			
			.status-circle {
				display: inline-block;
				width: 12px;
				height: 12px;
				border-radius: 50%;
			}
			
			.time-slot.available .status-circle,
			.status-circle.available {
				background-color: #28a745;
				box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
			}
			
			.time-slot.booked .status-circle,
			.status-circle.booked {
				background-color: #dc3545;
				box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
			}
			
			.time-slot.available .status-indicator {
				background-color: rgba(40, 167, 69, 0.1);
				color: #28a745;
			}
			
			.time-slot.booked .status-indicator {
				background-color: rgba(220, 53, 69, 0.1);
				color: #dc3545;
			}
			
			.appointment-info {
				margin-top: 10px;
				padding: 10px;
				background-color: #f8f9fa;
				border-radius: 4px;
				font-size: 0.9rem;
			}
			
			.book-now-prompt {
				margin-top: 10px;
				color: #6c757d;
				font-size: 0.85rem;
				font-style: italic;
			}
			
			.legend-container {
				display: flex;
				gap: 20px;
				padding: 10px 20px;
				border-top: 1px solid #eee;
			}
			
			.legend-item {
				display: flex;
				align-items: center;
				gap: 5px;
				font-size: 0.85rem;
			}
			
			.loading-spinner {
				border: 3px solid #f3f3f3;
				border-radius: 50%;
				border-top: 3px solid #3498db;
				width: 30px;
				height: 30px;
				animation: spin 1s linear infinite;
				margin: 0 auto;
			}
			
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			
			.time-slot.selected {
				border: 2px solid #4b6cb7;
				background-color: rgba(75, 108, 183, 0.05);
			}
			
			/* Pulse animation for available slots */
			@keyframes pulse {
				0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4); }
				70% { box-shadow: 0 0 0 6px rgba(40, 167, 69, 0); }
				100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
			}
			
			.time-slot.available:hover .status-circle {
				animation: pulse 1.5s infinite;
			}
		</style>
	`;
	
	frm.fields_dict.team_availability.$wrapper.html(html);
	
	// Add click handler for available time slots
	frm.fields_dict.team_availability.$wrapper.find('.time-slot.available').on('click', function() {
		frm.fields_dict.team_availability.$wrapper.find('.time-slot').removeClass('selected');
		$(this).addClass('selected');
		
		// Automatically update the appointment time when a slot is selected
		const selected_hour = $(this).data('hour');
		updateAppointmentDateTime(frm, selected_date, selected_hour);
	});
	
	// Add date picker change handler
	frm.fields_dict.team_availability.$wrapper.find('.date-picker').on('change', function() {
		const selected_date_str = $(this).val();
		if (selected_date_str) {
			// Get current hour from existing appointment time or use default
			const current_hour = frm.doc.appointment_date_time ? 
				new Date(frm.doc.appointment_date_time).getHours() : start_hour;
				
			// Create date object from selected date
			const new_date = new Date(selected_date_str);
			
			// Update calendar view with new date
			updateAppointmentDateTime(frm, new_date, current_hour);
		}
	});
}

// Function to update appointment date time
function updateAppointmentDateTime(frm, date, hour) {
	// Set the hour while preserving the date
	const appointment_date = new Date(date);
	appointment_date.setHours(hour, 0, 0);
	
	// Format the date to ISO string
	const formatted_datetime = appointment_date.toISOString().split('.')[0].replace('T', ' ');
	
	// Update the appointment datetime field
	frm.set_value('appointment_date_time', formatted_datetime);
	
	frappe.show_alert({
		message: `Appointment set for ${appointment_date.toLocaleDateString()} at ${format_time(hour + ':00')}`,
		indicator: 'green'
	});
}

// Helper function to check if a time slot is booked (considers date)
function is_time_slot_booked(appointments, hour, selected_date) {
	return appointments.some(function(appointment) {
		if (!appointment.appointment_date_time) return false;
		
		try {
			// Parse date manually to avoid frappe.datetime dependency
			const appt_time = new Date(appointment.appointment_date_time);
			return appt_time.getDate() === selected_date.getDate() && 
				   appt_time.getMonth() === selected_date.getMonth() && 
				   appt_time.getFullYear() === selected_date.getFullYear() && 
				   appt_time.getHours() === hour;
		} catch (e) {
			// If date parsing fails, assume not booked
			return false;
		}
	});
}

// Helper function to get appointment details for a time slot
function get_appointment_details(appointments, hour, selected_date) {
	const matching_appointments = appointments.filter(function(appointment) {
		if (!appointment.appointment_date_time) return false;
		
		try {
			// Parse date manually to avoid frappe.datetime dependency
			const appt_time = new Date(appointment.appointment_date_time);
			return appt_time.getDate() === selected_date.getDate() && 
				   appt_time.getMonth() === selected_date.getMonth() && 
				   appt_time.getFullYear() === selected_date.getFullYear() && 
				   appt_time.getHours() === hour;
		} catch (e) {
			return false;
		}
	});
	
	if (matching_appointments.length > 0) {
		const appointment = matching_appointments[0];
		return `<div class="appointment-info">
			Appointment: ${appointment.name} 
			${appointment.customer ? `- <strong>${appointment.customer}</strong>` : ''}
		</div>`;
	}
	return '';
}

// Helper function to format time from 24h to 12h format
function format_time(time_string) {
	let [hours, minutes] = time_string.split(':');
	hours = parseInt(hours);
	const period = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12 || 12;
	return `${hours}:${minutes || '00'} ${period}`;
}
