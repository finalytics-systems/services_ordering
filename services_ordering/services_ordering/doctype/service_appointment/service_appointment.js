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
	
	// Get the selected team information including shifts
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
						fields: ["appointment_date_time", "appointment_end_time", "name", "customer", "total_service_time"]
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
	// Get team's shifts from child table
	const shifts = team.shifts || [];
	
	if (!shifts.length) {
		frm.fields_dict.team_availability.$wrapper.html(
			'<div class="alert alert-warning">No shifts defined for this team. Please configure shifts in the team settings.</div>'
		);
		return;
	}
	
	// Sort shifts by start time
	shifts.sort((a, b) => {
		const timeA = parseInt(a.start_time.split(':')[0]);
		const timeB = parseInt(b.start_time.split(':')[0]);
		return timeA - timeB;
	});
	
	// Calculate overall working hours
	let total_working_hours = 0;
	shifts.forEach(shift => {
		const start_hour = parseInt(shift.start_time.split(':')[0]);
		const end_hour = parseInt(shift.end_time.split(':')[0]);
		total_working_hours += (end_hour - start_hour);
	});
	
	const first_shift_start = shifts[0].start_time;
	const last_shift_end = shifts[shifts.length - 1].end_time;
	

	
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
	
	// Calculate availability statistics
	const service_duration = frm.doc.total_service_time || 1;
	let available_slots = 0;
	let booked_slots = 0;
	
	// Count available and booked slots across all shifts
	shifts.forEach(shift => {
		const start_hour = parseInt(shift.start_time.split(':')[0]);
		const end_hour = parseInt(shift.end_time.split(':')[0]);
		
		for (let hour = start_hour; hour < end_hour; hour++) {
			const is_booked = is_time_slot_booked(appointments, hour, selected_date, service_duration);
			const can_accommodate = can_accommodate_service_duration_in_shifts(hour, shifts, service_duration);
			
			if (is_booked) {
				booked_slots++;
			} else if (can_accommodate) {
				available_slots++;
			}
		}
	});
	
	const availability_percentage = total_working_hours > 0 ? Math.round((available_slots / total_working_hours) * 100) : 0;
	
	// Start building HTML
	let html = `
		<div class="team-schedule-container">
			<div class="summary-section">
				<div class="summary-card team-card">
					<div class="summary-icon team-icon">👥</div>
					<div class="summary-content">
						<div class="summary-label">Team</div>
						<div class="summary-value">${team.name1}</div>
						<div class="summary-detail">${(team.team_members && team.team_members.length) || 0} members</div>
					</div>
				</div>
				
				<div class="summary-card duty-card">
					<div class="summary-icon duty-icon">⏰</div>
					<div class="summary-content">
						<div class="summary-label">Working Hours</div>
						<div class="summary-value">${shifts.length} shift${shifts.length > 1 ? 's' : ''}</div>
						<div class="summary-detail">${total_working_hours} hours, ${getScheduleStructure(shifts).break_periods.length} break${getScheduleStructure(shifts).break_periods.length !== 1 ? 's' : ''}</div>
					</div>
				</div>
				
				<div class="summary-card service-card">
					<div class="summary-icon service-icon">🕒</div>
					<div class="summary-content">
						<div class="summary-label">Service Duration</div>
						<div class="summary-value">${service_duration} hour${service_duration > 1 ? 's' : ''}</div>
						<div class="summary-detail">Per appointment</div>
					</div>
				</div>
				
				<div class="summary-card availability-card">
					<div class="summary-icon availability-icon">📊</div>
					<div class="summary-content">
						<div class="summary-label">Availability</div>
						<div class="summary-value">${available_slots} slots</div>
						<div class="summary-detail">${availability_percentage}% available</div>
					</div>
				</div>
				
				<div class="summary-card bookings-card">
					<div class="summary-icon bookings-icon">📋</div>
					<div class="summary-content">
						<div class="summary-label">Bookings Today</div>
						<div class="summary-value">${appointments.length}</div>
						<div class="summary-detail">${booked_slots} slots occupied</div>
					</div>
				</div>
			</div>
		
			<div class="schedule-header">
				<div class="header-content">
					<div class="header-left">
						<div class="schedule-icon">📅</div>
						<div class="header-text">
							<h4 class="team-name">Schedule for ${team.name1}</h4>
							<div class="header-subtitle">Plan and manage appointments</div>
						</div>
					</div>
					<div class="header-right">
						<div class="date-selector-container">
							<label class="date-label">📆 Select Date</label>
							<input type="date" class="date-picker" value="${date_yyyy_mm_dd}">
						</div>
					</div>
				</div>
			</div>
			
			<div class="date-display">
				<div class="date-display-content">
					<div class="date-icon">🗓️</div>
					<div class="date-info">
						<span class="selected-date">${formatted_date}</span>
						<span class="date-context">Viewing schedule</span>
					</div>
				</div>
			</div>
			
			<div class="calendar-view">
				<div class="time-slots">
	`;
	
	// Generate time slots for each shift and breaks
	const first_shift_start_hour = parseInt(shifts[0].start_time.split(':')[0]);
	const last_shift_end_hour = parseInt(shifts[shifts.length - 1].end_time.split(':')[0]);
	
	for (let hour = first_shift_start_hour; hour < last_shift_end_hour; hour++) {
		const slot_start_time = format_time(hour + ':00');
		const slot_end_time = format_time((hour + 1) + ':00');
		const slot_range_display = `${slot_start_time} - ${slot_end_time}`;
		
		// Check if this hour is within any shift or is a break
		const shift_info = getShiftInfoForHour(hour, shifts);
		const service_duration = frm.doc.total_service_time || 1;
		
		if (shift_info.is_break) {
			// This is a break slot
			const break_duration = shift_info.break_end - shift_info.break_start;
			html += `
				<div class="time-slot break-slot" data-hour="${hour}">
					<div class="time-info">
						<div class="time">${slot_range_display}</div>
						<div class="status-indicator">
							<span class="status-circle break"></span>
							<span class="status-text">${shift_info.break_name}</span>
						</div>
					</div>
					<div class="break-info">${break_duration} hour${break_duration > 1 ? 's' : ''} break</div>
				</div>
			`;
		} else {
			// This is a working slot
			const is_booked = is_time_slot_booked(appointments, hour, selected_date, service_duration);
			const slot_class = is_booked ? 'booked' : 'available';
			const is_current_selection = selected_date.getHours() === hour ? 'selected' : '';
			
			// Check if this slot can accommodate the full service duration
			const can_accommodate = can_accommodate_service_duration_in_shifts(hour, shifts, service_duration);
			// If slot is booked, keep it as booked regardless of accommodation
			const final_slot_class = is_booked ? 'booked' : (!can_accommodate ? 'unavailable' : slot_class);
			
			// Calculate which slots would be included in this booking
			const end_hour_for_booking = hour + service_duration;
			const slot_range = can_accommodate ? `${hour}-${end_hour_for_booking - 1}` : '';
			
			html += `
				<div class="time-slot ${final_slot_class} ${is_current_selection}" 
					 data-hour="${hour}" 
					 data-service-duration="${service_duration}"
					 data-slot-range="${slot_range}">
					<div class="time-info">
						<div class="time">${slot_range_display}</div>
						<div class="status-indicator">
							<span class="status-circle"></span>
							<span class="status-text">${is_booked ? 'Booked' : (!can_accommodate ? 'Insufficient Time' : 'Available')}</span>
						</div>
					</div>
					${service_duration > 1 && can_accommodate ? `<div class="duration-info">Will book: ${format_time(hour + ':00')} - ${format_time(end_hour_for_booking + ':00')} (${service_duration} hours)</div>` : ''}
					${service_duration > 1 && !can_accommodate ? `<div class="duration-info">Duration: ${service_duration} hour(s)</div>` : ''}
					${is_booked ? get_appointment_details(appointments, hour, selected_date) : ''}
					${!is_booked && can_accommodate ? '<div class="book-now-prompt">Available for booking</div>' : ''}
				</div>
			`;
		}
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
				<div class="legend-item unavailable-legend">
					<span class="status-circle" style="background-color: #ffc107; box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);"></span>
					<span>Insufficient Time</span>
				</div>
				<div class="legend-item break-legend">
					<span class="status-circle break"></span>
					<span>Break Time</span>
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
				padding: 20px;
				background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
				border-bottom: 1px solid #dee2e6;
				flex-wrap: wrap;
				gap: 15px;
			}
			
			.summary-card {
				display: flex;
				align-items: center;
				padding: 15px;
				min-width: 180px;
				flex: 1;
				background: white;
				border-radius: 10px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				transition: all 0.3s ease;
				border-left: 4px solid transparent;
			}
			
			.summary-card:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			}
			
			.summary-icon {
				font-size: 28px;
				margin-right: 15px;
				width: 50px;
				height: 50px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 12px;
				flex-shrink: 0;
			}
			
			.team-card { border-left-color: #4b6cb7; }
			.team-icon { background: linear-gradient(135deg, #4b6cb7, #6c5ce7); color: white; }
			
			.duty-card { border-left-color: #28a745; }
			.duty-icon { background: linear-gradient(135deg, #28a745, #20c997); color: white; }
			
			.service-card { border-left-color: #17a2b8; }
			.service-icon { background: linear-gradient(135deg, #17a2b8, #6f42c1); color: white; }
			
			.availability-card { border-left-color: #ffc107; }
			.availability-icon { background: linear-gradient(135deg, #ffc107, #fd7e14); color: white; }
			
			.bookings-card { border-left-color: #dc3545; }
			.bookings-icon { background: linear-gradient(135deg, #dc3545, #e83e8c); color: white; }
			
			.summary-content {
				flex: 1;
			}
			
			.summary-label {
				font-size: 0.75rem;
				color: #6c757d;
				margin-bottom: 4px;
				text-transform: uppercase;
				font-weight: 600;
				letter-spacing: 0.5px;
			}
			
			.summary-value {
				font-weight: 700;
				color: #212529;
				font-size: 1.1rem;
				margin-bottom: 2px;
			}
			
			.summary-detail {
				font-size: 0.8rem;
				color: #6c757d;
				font-weight: 500;
			}
			
			.schedule-header {
				background: linear-gradient(135deg, #F3D211 0%, #f1c40f 50%, #F3D211 100%);
				color: #2c3e50;
				padding: 20px 25px;
				border-radius: 12px 12px 0 0;
				box-shadow: 0 2px 8px rgba(243, 210, 17, 0.3);
				position: relative;
				overflow: hidden;
			}
			
			.schedule-header::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%);
				background-size: 20px 20px;
				pointer-events: none;
			}
			
			.header-content {
				display: flex;
				justify-content: space-between;
				align-items: center;
				flex-wrap: wrap;
				gap: 20px;
				position: relative;
				z-index: 1;
			}
			
			.header-left {
				display: flex;
				align-items: center;
				gap: 15px;
			}
			
			.schedule-icon {
				font-size: 32px;
				background: rgba(255,255,255,0.2);
				padding: 10px;
				border-radius: 12px;
				backdrop-filter: blur(10px);
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			}
			
			.header-text {
				display: flex;
				flex-direction: column;
			}
			
			.team-name {
				margin: 0;
				font-weight: 700;
				font-size: 1.4rem;
				color: #2c3e50;
				text-shadow: 0 1px 2px rgba(255,255,255,0.3);
			}
			
			.header-subtitle {
				font-size: 0.9rem;
				color: #34495e;
				font-weight: 500;
				margin-top: 2px;
				opacity: 0.9;
			}
			
			.header-right {
				display: flex;
				align-items: center;
			}
			
			.date-selector-container {
				display: flex;
				flex-direction: column;
				gap: 5px;
			}
			
			.date-label {
				font-size: 0.8rem;
				font-weight: 600;
				color: #2c3e50;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.date-picker {
				background: rgba(255,255,255,0.9);
				border: 2px solid rgba(255,255,255,0.3);
				border-radius: 8px;
				color: #2c3e50;
				font-weight: 600;
				padding: 8px 12px;
				font-size: 0.9rem;
				transition: all 0.3s ease;
				backdrop-filter: blur(10px);
				min-width: 160px;
			}
			
			.date-picker:focus {
				outline: none;
				border-color: rgba(255,255,255,0.8);
				background: rgba(255,255,255,1);
				box-shadow: 0 0 0 3px rgba(243, 210, 17, 0.3);
			}
			
			.date-display {
				background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
				padding: 15px 25px;
				border-bottom: 1px solid #dee2e6;
			}
			
			.date-display-content {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 12px;
			}
			
			.date-icon {
				font-size: 24px;
				background: rgba(243, 210, 17, 0.1);
				padding: 8px;
				border-radius: 8px;
			}
			
			.date-info {
				display: flex;
				flex-direction: column;
				align-items: center;
			}
			
			.selected-date {
				font-size: 1.1rem;
				font-weight: 700;
				color: #2c3e50;
			}
			
			.date-context {
				font-size: 0.8rem;
				color: #6c757d;
				font-weight: 500;
				text-transform: uppercase;
				letter-spacing: 0.5px;
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
				position: relative;
			}
			
			.time-slot.available {
				border-left-color: #28a745;
			}
			
			.time-slot.booked {
				border-left-color: #dc3545;
				cursor: not-allowed;
			}
			
			.time-slot.unavailable {
				border-left-color: #ffc107;
				background-color: #fff3cd;
				cursor: not-allowed;
				opacity: 0.7;
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
			
			.time-slot.unavailable .status-circle {
				background-color: #ffc107;
				box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
			}
			
			.time-slot.unavailable .status-indicator {
				background-color: rgba(255, 193, 7, 0.1);
				color: #ffc107;
			}
			
			.time-slot.break-slot {
				border-left-color: #6c757d;
				background-color: #f8f9fa;
				cursor: not-allowed;
				opacity: 0.8;
			}
			
			.time-slot.break-slot .status-circle,
			.status-circle.break {
				background-color: #6c757d;
				box-shadow: 0 0 0 2px rgba(108, 117, 125, 0.2);
			}
			
			.time-slot.break-slot .status-indicator {
				background-color: rgba(108, 117, 125, 0.1);
				color: #6c757d;
			}
			
			.break-info {
				margin-top: 5px;
				font-size: 0.8rem;
				color: #6c757d;
				font-style: italic;
			}
			
			.duration-info {
				margin-top: 5px;
				font-size: 0.8rem;
				color: #6c757d;
				font-weight: 500;
			}
			
			/* Slot grouping styles */
			.time-slot.slot-group-start {
				border-top: 3px solid #4b6cb7;
				border-top-left-radius: 8px;
				border-top-right-radius: 8px;
			}
			
			.time-slot.slot-group-middle {
				border-left: 3px solid #4b6cb7;
				border-right: 3px solid #4b6cb7;
				border-radius: 0;
				margin-top: -1px;
			}
			
			.time-slot.slot-group-end {
				border-bottom: 3px solid #4b6cb7;
				border-bottom-left-radius: 8px;
				border-bottom-right-radius: 8px;
				margin-top: -1px;
			}
			
			.time-slot.slot-group-single {
				border: 3px solid #4b6cb7;
			}
			
			.time-slot.slot-group-preview {
				background-color: rgba(75, 108, 183, 0.1);
				transform: scale(1.02);
				box-shadow: 0 4px 12px rgba(75, 108, 183, 0.3);
			}
			
			.slot-group-indicator {
				position: absolute;
				right: 10px;
				top: 10px;
				background-color: #4b6cb7;
				color: white;
				border-radius: 12px;
				padding: 2px 8px;
				font-size: 0.7rem;
				font-weight: 600;
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
	
	// Add hover handler for available time slots to show preview (exclude break slots)
	frm.fields_dict.team_availability.$wrapper.find('.time-slot.available:not(.break-slot)').on('mouseenter', function() {
		const start_hour = $(this).data('hour');
		const service_duration = $(this).data('service-duration');
		highlightSlotGroup(frm, start_hour, service_duration, 'preview');
	}).on('mouseleave', function() {
		clearSlotGroupHighlight(frm);
	});
	
	// Add click handler for available time slots (exclude break slots)
	frm.fields_dict.team_availability.$wrapper.find('.time-slot.available:not(.break-slot)').on('click', function() {
		const selected_hour = $(this).data('hour');
		const service_duration = frm.doc.total_service_time || 1;
		
		// Clear previous selections
		frm.fields_dict.team_availability.$wrapper.find('.time-slot').removeClass('selected slot-group-start slot-group-middle slot-group-end slot-group-single slot-group-preview');
		
		// Get shifts for highlighting
		const shifts = team.shifts || [];
		
		// Highlight the selected slot group
		highlightSlotGroup(frm, selected_hour, service_duration, 'selected');
		
		// Update the appointment time
		updateAppointmentDateTime(frm, selected_date, selected_hour, service_duration);
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
			const service_duration = frm.doc.total_service_time || 1;
			
			// Refresh the calendar view with new date
			display_team_availability(frm);
		}
	});
}

// Function to update appointment date time
function updateAppointmentDateTime(frm, date, hour, service_duration = 1) {
	// Set the start hour while preserving the date
	const start_date = new Date(date);
	start_date.setHours(hour, 0, 0, 0);
	
	// Calculate end time by adding service duration
	const end_date = new Date(start_date);
	end_date.setHours(hour + service_duration, 0, 0, 0);
	
	// Format the dates for Frappe (YYYY-MM-DD HH:MM:SS format)
	// Use manual formatting to avoid timezone issues
	const formatted_start_datetime = formatDateTimeForFrappe(start_date);
	const formatted_end_datetime = formatDateTimeForFrappe(end_date);
	
	// Update both appointment datetime fields
	frm.set_value('appointment_date_time', formatted_start_datetime);
	frm.set_value('appointment_end_time', formatted_end_datetime);
	
	const start_time_display = format_time(hour + ':00');
	const end_time_display = format_time((hour + service_duration) + ':00');
	
	frappe.show_alert({
		message: `Appointment set for ${start_date.toLocaleDateString()} from ${start_time_display} to ${end_time_display} (${service_duration} hour${service_duration > 1 ? 's' : ''})`,
		indicator: 'green'
	});
}

// Helper function to check if a time slot is booked (considers date and service duration)
function is_time_slot_booked(appointments, hour, selected_date, service_duration = 1) {
	return appointments.some(function(appointment) {
		if (!appointment.appointment_date_time) return false;
		
		try {
			// Parse appointment start time
			const appt_start = new Date(appointment.appointment_date_time);
			
			// Check if appointment is on the same date
			if (appt_start.getDate() !== selected_date.getDate() || 
				appt_start.getMonth() !== selected_date.getMonth() || 
				appt_start.getFullYear() !== selected_date.getFullYear()) {
				return false;
			}
			
			const appt_start_hour = appt_start.getHours();
			
			// Get appointment end time from the appointment_end_time field if available
			let appt_end_hour = appt_start_hour + 1; // Default 1 hour
			if (appointment.appointment_end_time) {
				try {
					const appt_end = new Date(appointment.appointment_end_time);
					appt_end_hour = appt_end.getHours();
				} catch (e) {
					// Use total_service_time if available
					if (appointment.total_service_time) {
						appt_end_hour = appt_start_hour + appointment.total_service_time;
					}
				}
			} else if (appointment.total_service_time) {
				appt_end_hour = appt_start_hour + appointment.total_service_time;
			}
			
			// Calculate the proposed slot's end time
			const slot_start_hour = hour;
			const slot_end_hour = hour + service_duration;
			
			// Check for overlap: slots overlap if one starts before the other ends
			return (slot_start_hour < appt_end_hour && slot_end_hour > appt_start_hour);
		} catch (e) {
			// If date parsing fails, assume not booked
			return false;
		}
	});
}

// Helper function to check if a time slot can accommodate the service duration
function can_accommodate_service_duration(start_hour, duty_end_hour, service_duration) {
	const required_end_hour = start_hour + service_duration;
	// The service must end before or at the duty end hour
	return required_end_hour <= duty_end_hour;
}

// Helper function to get shift information for a specific hour
function getShiftInfoForHour(hour, shifts) {
	// Check if hour is within any shift
	for (let shift of shifts) {
		const shift_start = parseInt(shift.start_time.split(':')[0]);
		const shift_end = parseInt(shift.end_time.split(':')[0]);
		
		if (hour >= shift_start && hour < shift_end) {
			return {
				is_break: false,
				is_working: true,
				shift: shift,
				shift_start: shift_start,
				shift_end: shift_end,
				shift_index: shifts.indexOf(shift)
			};
		}
	}
	
	// If not in any shift, determine break information
	const break_info = getBreakInfoForHour(hour, shifts);
	return {
		is_break: true,
		is_working: false,
		shift: null,
		shift_start: null,
		shift_end: null,
		break_start: break_info.break_start,
		break_end: break_info.break_end,
		break_name: break_info.break_name
	};
}

// Helper function to get break information for a specific hour
function getBreakInfoForHour(hour, shifts) {
	// Sort shifts by start time
	const sorted_shifts = [...shifts].sort((a, b) => {
		return parseInt(a.start_time.split(':')[0]) - parseInt(b.start_time.split(':')[0]);
	});
	
	// Find which break period this hour falls into
	for (let i = 0; i < sorted_shifts.length - 1; i++) {
		const current_shift_end = parseInt(sorted_shifts[i].end_time.split(':')[0]);
		const next_shift_start = parseInt(sorted_shifts[i + 1].start_time.split(':')[0]);
		
		if (hour >= current_shift_end && hour < next_shift_start) {
			return {
				break_start: current_shift_end,
				break_end: next_shift_start,
				break_name: `Break ${i + 1}`,
				break_index: i
			};
		}
	}
	
	// Check if it's before first shift or after last shift
	const first_shift_start = parseInt(sorted_shifts[0].start_time.split(':')[0]);
	const last_shift_end = parseInt(sorted_shifts[sorted_shifts.length - 1].end_time.split(':')[0]);
	
	if (hour < first_shift_start) {
		return {
			break_start: 0, // Start of day
			break_end: first_shift_start,
			break_name: "Pre-shift",
			break_index: -1
		};
	} else if (hour >= last_shift_end) {
		return {
			break_start: last_shift_end,
			break_end: 24, // End of day
			break_name: "Post-shift",
			break_index: sorted_shifts.length
		};
	}
	
	return {
		break_start: hour,
		break_end: hour + 1,
		break_name: "Unknown Break",
		break_index: -1
	};
}

// Helper function to check if a time slot can accommodate service duration across shifts
function can_accommodate_service_duration_in_shifts(start_hour, shifts, service_duration) {
	// Check if we can fit the entire service duration starting from this hour
	let hours_needed = service_duration;
	let current_hour = start_hour;
	
	// First check: starting hour must be in a working shift
	const start_shift_info = getShiftInfoForHour(current_hour, shifts);
	if (start_shift_info.is_break) {
		return false; // Can't start during a break
	}
	
	while (hours_needed > 0) {
		const shift_info = getShiftInfoForHour(current_hour, shifts);
		
		// If we hit a break, we can't accommodate continuous service
		if (shift_info.is_break) {
			return false;
		}
		
		// Calculate hours available in current shift
		const hours_available_in_shift = shift_info.shift_end - current_hour;
		
		if (hours_available_in_shift >= hours_needed) {
			// We can fit the remaining duration in this shift
			return true;
		} else {
			// Use up this shift and move to the next hour
			hours_needed -= hours_available_in_shift;
			current_hour = shift_info.shift_end;
			
			// If we still need more hours, check if there's a continuous next shift
			if (hours_needed > 0) {
				const next_hour_info = getShiftInfoForHour(current_hour, shifts);
				if (next_hour_info.is_break) {
					return false; // There's a break, can't continue service
				}
			}
		}
	}
	
	return true;
}

// Helper function to get all working hours and break periods
function getScheduleStructure(shifts) {
	if (!shifts || shifts.length === 0) return { working_periods: [], break_periods: [] };
	
	// Sort shifts by start time
	const sorted_shifts = [...shifts].sort((a, b) => {
		return parseInt(a.start_time.split(':')[0]) - parseInt(b.start_time.split(':')[0]);
	});
	
	const working_periods = sorted_shifts.map(shift => ({
		start: parseInt(shift.start_time.split(':')[0]),
		end: parseInt(shift.end_time.split(':')[0]),
		shift: shift
	}));
	
	const break_periods = [];
	
	// Add pre-shift break if first shift doesn't start at beginning of day
	const first_shift_start = working_periods[0].start;
	if (first_shift_start > 0) {
		break_periods.push({
			start: 0,
			end: first_shift_start,
			name: "Pre-shift",
			type: "pre"
		});
	}
	
	// Add breaks between shifts
	for (let i = 0; i < working_periods.length - 1; i++) {
		const current_end = working_periods[i].end;
		const next_start = working_periods[i + 1].start;
		
		if (current_end < next_start) {
			break_periods.push({
				start: current_end,
				end: next_start,
				name: `Break ${i + 1}`,
				type: "between"
			});
		}
	}
	
	// Add post-shift break if last shift doesn't end at end of day
	const last_shift_end = working_periods[working_periods.length - 1].end;
	if (last_shift_end < 24) {
		break_periods.push({
			start: last_shift_end,
			end: 24,
			name: "Post-shift",
			type: "post"
		});
	}
	
	return { working_periods, break_periods };
}

// Helper function to get appointment details for a time slot
function get_appointment_details(appointments, hour, selected_date) {
	const matching_appointments = appointments.filter(function(appointment) {
		if (!appointment.appointment_date_time) return false;
		
		try {
			// Parse appointment start time
			const appt_start = new Date(appointment.appointment_date_time);
			
			// Check if appointment is on the same date
			if (appt_start.getDate() !== selected_date.getDate() || 
				appt_start.getMonth() !== selected_date.getMonth() || 
				appt_start.getFullYear() !== selected_date.getFullYear()) {
				return false;
			}
			
			const appt_start_hour = appt_start.getHours();
			
			// Get actual end time
			let appt_end_hour = appt_start_hour + 1; // Default 1 hour
			if (appointment.appointment_end_time) {
				try {
					const appt_end = new Date(appointment.appointment_end_time);
					appt_end_hour = appt_end.getHours();
				} catch (e) {
					if (appointment.total_service_time) {
						appt_end_hour = appt_start_hour + appointment.total_service_time;
					}
				}
			} else if (appointment.total_service_time) {
				appt_end_hour = appt_start_hour + appointment.total_service_time;
			}
			
			// Check if this hour falls within the appointment duration
			return hour >= appt_start_hour && hour < appt_end_hour;
		} catch (e) {
			return false;
		}
	});
	
	if (matching_appointments.length > 0) {
		const appointment = matching_appointments[0];
		const appt_start = new Date(appointment.appointment_date_time);
		const appt_start_hour = appt_start.getHours();
		
		// Get actual end time
		let appt_end_hour = appt_start_hour + 1; // Default 1 hour
		if (appointment.appointment_end_time) {
			try {
				const appt_end = new Date(appointment.appointment_end_time);
				appt_end_hour = appt_end.getHours();
			} catch (e) {
				if (appointment.total_service_time) {
					appt_end_hour = appt_start_hour + appointment.total_service_time;
				}
			}
		} else if (appointment.total_service_time) {
			appt_end_hour = appt_start_hour + appointment.total_service_time;
		}
		
		const start_time = format_time(appt_start_hour + ':00');
		const end_time = format_time(appt_end_hour + ':00');
		const duration = appt_end_hour - appt_start_hour;
		
		return `<div class="appointment-info">
			<strong>Appointment:</strong> ${appointment.name}<br>
			${appointment.customer ? `<strong>Customer:</strong> ${appointment.customer}<br>` : ''}
			<strong>Time:</strong> ${start_time} - ${end_time}${duration > 1 ? ` (${duration} hours)` : ''}
		</div>`;
	}
	return '';
}

// Helper function to format time in 24h format
function format_time(time_string) {
	let [hours, minutes] = time_string.split(':');
	hours = parseInt(hours);
	return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
}

// Helper function to format date time for Frappe (avoiding timezone issues)
function formatDateTimeForFrappe(date) {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper function to highlight slot groups
function highlightSlotGroup(frm, start_hour, service_duration, mode) {
	const end_hour = start_hour + service_duration;
	
	for (let hour = start_hour; hour < end_hour; hour++) {
		const slot = frm.fields_dict.team_availability.$wrapper.find(`.time-slot[data-hour="${hour}"]`);
		
		if (slot.length) {
			// Add preview or selected class
			if (mode === 'preview') {
				slot.addClass('slot-group-preview');
			}
			
			// Add grouping classes
			if (service_duration === 1) {
				slot.addClass('slot-group-single');
				if (mode === 'selected') slot.addClass('selected');
			} else {
				if (hour === start_hour) {
					slot.addClass('slot-group-start');
				} else if (hour === end_hour - 1) {
					slot.addClass('slot-group-end');
				} else {
					slot.addClass('slot-group-middle');
				}
				
				if (mode === 'selected') slot.addClass('selected');
				
				// Add slot indicator for multi-hour bookings
				if (mode === 'selected' && hour === start_hour) {
					slot.find('.time-info').append(`<div class="slot-group-indicator">${service_duration}h</div>`);
				}
			}
		}
	}
}

// Helper function to clear slot group highlights
function clearSlotGroupHighlight(frm) {
	// Only clear preview classes, not selected classes
	frm.fields_dict.team_availability.$wrapper.find('.time-slot').removeClass('slot-group-preview');
	
	// Remove grouping classes only if they're not part of a selected group
	frm.fields_dict.team_availability.$wrapper.find('.time-slot').each(function() {
		const $slot = $(this);
		if (!$slot.hasClass('selected')) {
			$slot.removeClass('slot-group-start slot-group-middle slot-group-end slot-group-single');
		}
	});
	
	// Remove preview indicators (but keep selected indicators)
	frm.fields_dict.team_availability.$wrapper.find('.time-slot:not(.selected) .slot-group-indicator').remove();
}
