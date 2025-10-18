frappe.ui.form.on('Sales Order', {
    refresh: function(frm) {
        // Add Send Email button at the top as primary button
        if (frm.doc.docstatus === 1) {  // Only show for submitted orders
            frm.add_custom_button(__('Send Email'), function() {
                send_sales_order_email(frm);
            }).addClass('btn-primary');
        }
    }
});

function send_sales_order_email(frm) {
    // Show loading indicator
    frappe.show_alert({
        message: __('Preparing to send email...'),
        indicator: 'blue'
    }, 3);
    
    // Call backend method to send email
    frappe.call({
        method: 'services_ordering.services_ordering.page.sales_order_portal.sales_order_portal.send_sales_order_email',
        args: {
            sales_order_name: frm.doc.name,
            customer_name: frm.doc.customer
        },
        freeze: true,
        freeze_message: __('Sending Email...'),
        callback: function(r) {
            if (r.message && r.message.success) {
                frappe.show_alert({
                    message: r.message.message || __('Email sent successfully!'),
                    indicator: 'green'
                }, 5);
                
                // Show detailed message dialog
                frappe.msgprint({
                    title: __('Email Sent'),
                    message: r.message.message,
                    indicator: 'green'
                });
            } else {
                frappe.show_alert({
                    message: r.message.message || __('Error sending email'),
                    indicator: 'red'
                }, 5);
                
                // Show error dialog
                frappe.msgprint({
                    title: __('Error'),
                    message: r.message.message || __('Error sending email. Please check if customer has a valid email address.'),
                    indicator: 'red'
                });
            }
        },
        error: function(r) {
            frappe.show_alert({
                message: __('Error sending email. Please try again.'),
                indicator: 'red'
            }, 5);
            
            frappe.msgprint({
                title: __('Error'),
                message: __('Failed to send email. Please ensure the customer has a valid email address in their contact details.'),
                indicator: 'red'
            });
        }
    });
}

