import frappe
from frappe import _
import re
import requests

# Allow guest access to this page
no_cache = 1

# reCAPTCHA Secret Key
RECAPTCHA_SECRET_KEY = "6Lfstu8rAAAAAB8Dkl67_QDVFarvYK4W_ITn5frO"


def get_context(context):
    """
    Context for the contact us page
    """
    context.no_cache = 1
    context.show_sidebar = False
    return context


def verify_recaptcha(captcha_response):
    """
    Verify reCAPTCHA response with Google
    """
    if not captcha_response:
        return False
    
    try:
        verify_url = "https://www.google.com/recaptcha/api/siteverify"
        data = {
            "secret": RECAPTCHA_SECRET_KEY,
            "response": captcha_response
        }
        
        response = requests.post(verify_url, data=data, timeout=10)
        result = response.json()
        
        return result.get("success", False)
    except Exception as e:
        frappe.log_error(f"reCAPTCHA verification error: {str(e)}")
        return False


@frappe.whitelist(allow_guest=True)
def submit_contact_form(full_name, mobile_number, email=None, city=None, district=None, query=None, captcha_response=None):
    """
    Handle contact form submission
    This endpoint is publicly accessible (allow_guest=True)
    """
    try:
        # Verify reCAPTCHA first
        if not verify_recaptcha(captcha_response):
            return {
                "success": False,
                "error": _("reCAPTCHA verification failed. Please try again.")
            }
        
        # Validate required fields
        if not full_name or not full_name.strip():
            return {
                "success": False,
                "error": _("Full Name is required")
            }
        
        if not mobile_number or not mobile_number.strip():
            return {
                "success": False,
                "error": _("Mobile Number is required")
            }
        
        # Validate Saudi mobile number format
        # Remove spaces and validate format: +966 followed by 5 and 8 more digits
        mobile_cleaned = mobile_number.strip().replace(" ", "")
        saudi_mobile_pattern = r'^\+9665\d{8}$'
        
        if not re.match(saudi_mobile_pattern, mobile_cleaned):
            return {
                "success": False,
                "error": _("Please enter a valid Saudi mobile number (format: +966 5X XXX XXXX)")
            }
        
        # Validate email if provided
        if email and email.strip():
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, email.strip()):
                return {
                    "success": False,
                    "error": _("Please enter a valid email address")
                }
        
        # Create a new Contact Us record
        # Note: You need to create a "Contact Us Query" DocType in Frappe
        # For now, we'll create a Lead record as an alternative
        doc = frappe.get_doc({
            "doctype": "Lead",
            "lead_name": full_name.strip(),
            "mobile_no": mobile_number.strip(),
            "email_id": email.strip() if email else None,
            "city": city.strip() if city else "Riyadh",
            "custom_district": district.strip() if district else None,
            "notes": query.strip() if query else None,
            "source": "Website Contact Form",
            "status": "Lead"
        })
        
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        
        # Optional: Send email notification to admin
        try:
            frappe.sendmail(
                recipients=frappe.get_all("User", filters={"role": "System Manager"}, pluck="email"),
                subject=f"New Contact Form Submission from {full_name}",
                message=f"""
                    <h3>New Contact Form Submission</h3>
                    <p><strong>Full Name:</strong> {full_name}</p>
                    <p><strong>Mobile Number:</strong> {mobile_number}</p>
                    <p><strong>Email:</strong> {email or 'Not provided'}</p>
                    <p><strong>City:</strong> {city or 'Riyadh'}</p>
                    <p><strong>District:</strong> {district or 'Not specified'}</p>
                    <p><strong>Query:</strong></p>
                    <p>{query or 'No query provided'}</p>
                """,
                now=True
            )
        except Exception as e:
            frappe.log_error(f"Failed to send email notification: {str(e)}")
        
        return {
            "success": True,
            "message": _("Thank you for contacting us. We will get back to you soon.")
        }
        
    except Exception as e:
        frappe.log_error(f"Contact Form Submission Error: {str(e)}")
        return {
            "success": False,
            "error": _("An error occurred while submitting the form. Please try again.")
        }

