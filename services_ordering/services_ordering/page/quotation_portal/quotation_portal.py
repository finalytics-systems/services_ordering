import frappe
from frappe import _
from frappe.utils import nowdate, flt, cint
import json


@frappe.whitelist()
def test_connection():
    """Simple test function to verify backend connectivity"""
    return {"success": True, "message": "Backend connection successful!", "timestamp": frappe.utils.now()}

@frappe.whitelist()
def get_customers():
    """Get list of customers for the dropdown"""
    try:
        customers = frappe.get_all(
            "Customer",
            fields=["name", "customer_name", "customer_group", "territory", "customer_type", "mobile_no", "email_id"],
            filters={
                "disabled": 0,
                "customer_group": "Sage"
                },
            order_by="customer_name asc",
            limit=200
        )
        return {"success": True, "data": customers}
    except Exception as e:
        frappe.log_error(f"Error fetching customers: {str(e)}", "Quotation Form - Get Customers")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_companies():
    """Get list of companies for the dropdown"""
    try:
        companies = frappe.get_all(
            "Company",
            fields=["name", "company_name", "default_currency", "country"],
            order_by="name asc"
        )
        return {"success": True, "data": companies}
    except Exception as e:
        frappe.log_error(f"Error fetching companies: {str(e)}", "Quotation Form - Get Companies")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_items():
    """Get list of sales items for the dropdown"""
    try:
        # First, get item names that have Sage Services Co Ltd in item defaults
        items_with_sage_company = frappe.db.sql("""
            SELECT parent as item_code
            FROM `tabItem Default`
            WHERE company = 'Sage Services Co Ltd'
        """, as_dict=True)
        
        # Extract item codes from the result
        sage_item_codes = [item.item_code for item in items_with_sage_company]
        
        if not sage_item_codes:
            # Return empty list if no items found
            return {"success": True, "data": []}
        
        # Get details of these items
        items = frappe.get_all(
            "Item",
            fields=[
                "name", "item_name", "description", "stock_uom", 
                "standard_rate", "item_group", "brand", "has_variants"
            ],
            filters={
                "disabled": 0,
                "is_sales_item": 1,
                "has_variants": 0,  # Exclude template items
                "name": ["in", sage_item_codes]  # Filter by item codes with Sage company
            },
            order_by="item_name asc",
            limit=500
        )
        
        # Get prices from Item Price list for each item
        for item in items:
            price_doc = frappe.get_all(
                "Item Price",
                fields=["price_list_rate"],
                filters={
                    "item_code": item.name,
                    "price_list": "البيع القياسية",
                    "selling": 1
                },
                limit=1
            )
            if price_doc:
                item["standard_rate"] = price_doc[0].price_list_rate
        
        return {"success": True, "data": items}
    except Exception as e:
        frappe.log_error(f"Error fetching items: {str(e)}", "Quotation Form - Get Items")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_warehouses():
    """Get list of warehouses for the dropdown"""
    try:
        warehouses = frappe.get_all(
            "Warehouse",
            fields=["name", "warehouse_name", "company", "is_group"],
            filters={"disabled": 0, "is_group": 0},
            order_by="name asc"
        )
        return {"success": True, "data": warehouses}
    except Exception as e:
        frappe.log_error(f"Error fetching warehouses: {str(e)}", "Quotation Form - Get Warehouses")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_territories():
    """Get list of territories for the dropdown"""
    try:
        territories = frappe.get_all(
            "Territory",
            fields=["name", "territory_name", "parent_territory"],
            filters={"is_group": 0},
            order_by="name asc"
        )
        return {"success": True, "data": territories}
    except Exception as e:
        frappe.log_error(f"Error fetching territories: {str(e)}", "Quotation Form - Get Territories")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_customer_groups():
    """Get list of customer groups for the dropdown"""
    try:
        customer_groups = frappe.get_all(
            "Customer Group",
            fields=["name", "customer_group_name", "parent_customer_group"],
            filters={"is_group": 0},
            order_by="name asc"
        )
        return {"success": True, "data": customer_groups}
    except Exception as e:
        frappe.log_error(f"Error fetching customer groups: {str(e)}", "Quotation Form - Get Customer Groups")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_price_lists():
    """Get list of selling price lists"""
    try:
        price_lists = frappe.get_all(
            "Price List",
            fields=["name", "currency", "enabled"],
            filters={"enabled": 1, "selling": 1},
            order_by="name asc"
        )
        return {"success": True, "data": price_lists}
    except Exception as e:
        frappe.log_error(f"Error fetching price lists: {str(e)}", "Quotation Form - Get Price Lists")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_cities():
    """Get list of cities for the dropdown"""
    try:
        cities = frappe.get_all(
            "City",
            fields=["city"],
            filters={"disabled": 0} if frappe.db.has_column("City", "disabled") else {},
            order_by="city asc"
        )
        return {"success": True, "data": cities}
    except Exception as e:
        frappe.log_error(f"Error fetching cities: {str(e)}", "Quotation Form - Get Cities")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_neighborhoods(city=None):
    """Get list of neighborhoods for the dropdown, optionally filtered by city"""
    try:
        filters = {}
        
        # Add disabled filter if column exists
        if frappe.db.has_column("Neighborhood", "disabled"):
            filters["disabled"] = 0
        
        # Add city filter if provided
        if city:
            filters["city"] = city
        
        neighborhoods = frappe.get_all(
            "Neighborhood",
            fields=["name", "city"],
            filters=filters,
            order_by="name asc"
        )
        return {"success": True, "data": neighborhoods}
    except Exception as e:
        frappe.log_error(f"Error fetching neighborhoods: {str(e)}", "Quotation Form - Get Neighborhoods")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_customer_details(customer):
    """Get detailed customer information"""
    try:
        if not customer:
            return {"success": False, "message": "Customer is required"}
        
        customer_doc = frappe.get_doc("Customer", customer)
        
        # Get default address
        default_address = None
        addresses = frappe.get_all(
            "Dynamic Link",
            fields=["parent"],
            filters={
                "link_doctype": "Customer",
                "link_name": customer,
                "parenttype": "Address"
            }
        )
        
        if addresses:
            address_doc = frappe.get_doc("Address", addresses[0].parent)
            default_address = {
                "name": address_doc.name,
                "address_line1": address_doc.address_line1,
                "address_line2": address_doc.address_line2,
                "city": address_doc.city,
                "state": address_doc.state,
                "country": address_doc.country,
                "pincode": address_doc.pincode
            }
        
        # Get default contact
        default_contact = None
        contacts = frappe.get_all(
            "Dynamic Link",
            fields=["parent"],
            filters={
                "link_doctype": "Customer",
                "link_name": customer,
                "parenttype": "Contact"
            }
        )
        
        if contacts:
            contact_doc = frappe.get_doc("Contact", contacts[0].parent)
            default_contact = {
                "name": contact_doc.name,
                "first_name": contact_doc.first_name,
                "last_name": contact_doc.last_name,
                "email_id": contact_doc.email_id,
                "mobile_no": contact_doc.mobile_no,
                "phone": contact_doc.phone
            }
        
        customer_details = {
            "customer_name": customer_doc.customer_name,
            "customer_group": customer_doc.customer_group,
            "territory": customer_doc.territory,
            "customer_type": customer_doc.customer_type,
            "default_currency": customer_doc.default_currency,
            "default_price_list": customer_doc.default_price_list,
            "payment_terms": customer_doc.payment_terms,
            "credit_limit": customer_doc.credit_limit,
            "default_address": default_address,
            "default_contact": default_contact
        }
        
        return {"success": True, "data": customer_details}
    except Exception as e:
        frappe.log_error(f"Error fetching customer details: {str(e)}", "Quotation Form - Get Customer Details")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_item_details(item_code, customer=None, company=None, price_list=None):
    """Get detailed item information including price"""
    try:
        if not item_code:
            return {"success": False, "message": "Item code is required"}
        
        item_doc = frappe.get_doc("Item", item_code)
        
        # Get item price
        item_price = 0
        if price_list:
            price_doc = frappe.get_all(
                "Item Price",
                fields=["price_list_rate"],
                filters={
                    "item_code": item_code,
                    "price_list": price_list,
                    "selling": 1
                },
                limit=1
            )
            if price_doc:
                item_price = price_doc[0].price_list_rate
        
        # Fallback to standard rate if no price list rate found
        if not item_price:
            item_price = item_doc.standard_rate or 0
        
        # Get item tax template
        item_tax_template = None
        if item_doc.taxes:
            item_tax_template = item_doc.taxes[0].item_tax_template
        
        item_details = {
            "item_name": item_doc.item_name,
            "description": item_doc.description,
            "stock_uom": item_doc.stock_uom,
            "rate": item_price,
            "item_group": item_doc.item_group,
            "brand": item_doc.brand,
            "item_tax_template": item_tax_template,
            "weight_per_unit": item_doc.weight_per_unit,
            "weight_uom": item_doc.weight_uom
        }
        
        return {"success": True, "data": item_details}
    except Exception as e:
        frappe.log_error(f"Error fetching item details: {str(e)}", "Quotation Form - Get Item Details")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def create_quotation(quotation_data):
    """Create a new quotation in ERPNext"""
    try:
        # Parse the JSON data if it's a string
        if isinstance(quotation_data, str):
            quotation_data = json.loads(quotation_data)
        
        # Validate required fields
        if not quotation_data.get("customer"):
            return {"success": False, "message": "Customer is required"}
        
        if not quotation_data.get("items") or len(quotation_data.get("items", [])) == 0:
            return {"success": False, "message": "At least one item is required"}
        
        # Create new Quotation document
        quotation = frappe.new_doc("Quotation")
        
        # Set basic fields with static values
        quotation.quotation_to = "Customer"  # Quotation to Customer
        quotation.party_name = quotation_data.get("customer")  # Customer name in party_name field
        quotation.company = "Sage Services Co Ltd"  # Static company
        quotation.currency = "SAR"  # Static currency
        quotation.transaction_date = quotation_data.get("transaction_date", nowdate())
        quotation.valid_till = quotation_data.get("delivery_date") or quotation_data.get("valid_till")  # Using delivery_date as valid_till for quotation
        pl_candidate = quotation_data.get("selling_price_list") or quotation_data.get("price_list")
        valid_price_list = None
        if pl_candidate and frappe.db.exists("Price List", {"name": pl_candidate, "enabled": 1, "selling": 1}):
            valid_price_list = pl_candidate
            quotation.selling_price_list = pl_candidate
        
        # Optional fields
        if quotation_data.get("customer_group"):
            quotation.customer_group = quotation_data.get("customer_group")
        if quotation_data.get("territory"):
            quotation.territory = quotation_data.get("territory")
        
        # Handle custom payment mode field
        if quotation_data.get("custom_payment_mode"):
            quotation.custom_payment_mode = quotation_data.get("custom_payment_mode")
            print(f"Setting custom_payment_mode to {quotation_data.get('custom_payment_mode')}")
            frappe.log_error(f"Setting custom_payment_mode to {quotation_data.get('custom_payment_mode')}", "Quotation Form - Custom Payment Mode")
            
        if quotation_data.get("source"):
            quotation.source = quotation_data.get("source")
        if quotation_data.get("project"):
            quotation.project = quotation_data.get("project")
        if quotation_data.get("cost_center"):
            quotation.cost_center = quotation_data.get("cost_center")
        
        # Address and contact details
        if quotation_data.get("customer_address"):
            quotation.customer_address = quotation_data.get("customer_address")
        if quotation_data.get("shipping_address_name"):
            quotation.shipping_address_name = quotation_data.get("shipping_address_name")
        if quotation_data.get("contact_person"):
            quotation.contact_person = quotation_data.get("contact_person")
        
        # Terms and conditions
        if quotation_data.get("tc_name"):
            quotation.tc_name = quotation_data.get("tc_name")
            # Fetch terms content from Terms and Conditions template
            try:
                tc_doc = frappe.get_doc("Terms and Conditions", quotation_data.get("tc_name"))
                if tc_doc and tc_doc.terms:
                    quotation.terms = tc_doc.terms
            except Exception as e:
                frappe.log_error(f"Error fetching terms and conditions: {str(e)}", "Quotation Form - Terms and Conditions")
        if quotation_data.get("terms"):
            quotation.terms = quotation_data.get("terms")
        
        # Payment terms
        if quotation_data.get("payment_terms_template"):
            quotation.payment_terms_template = quotation_data.get("payment_terms_template")
        
        # Taxes and charges - skip setting template and directly add tax row
        # if quotation_data.get("taxes_and_charges"):
        #     quotation.taxes_and_charges = quotation_data.get("taxes_and_charges")
        # else:
        #     # Set the template exactly as shown in the system
        #     quotation.taxes_and_charges = "VAT 15%"
        
        # Always add the tax row directly
        tax_row = quotation.append("taxes", {})
        tax_row.charge_type = "On Net Total"
        tax_row.account_head = "KSA VAT15% - SSC"
        tax_row.description = "VAT 15%"
        tax_row.rate = 15
        
        # Shipping
        if quotation_data.get("shipping_rule"):
            quotation.shipping_rule = quotation_data.get("shipping_rule")
        
        # Add items
        for item_data in quotation_data.get("items", []):
            if not item_data.get("item_code") or not item_data.get("qty"):
                continue
                
            item_row = quotation.append("items", {})
            item_row.item_code = item_data.get("item_code")
            item_row.qty = flt(item_data.get("qty", 1))
            # Use client-provided rate if positive; else compute from price list or standard_rate
            client_rate = flt(item_data.get("rate", 0))
            price_list = valid_price_list
            computed_rate = 0
            if client_rate > 0:
                computed_rate = client_rate
            else:
                if price_list:
                    price_doc = frappe.get_all(
                        "Item Price",
                        fields=["price_list_rate"],
                        filters={
                            "item_code": item_row.item_code,
                            "price_list": price_list,
                            "selling": 1
                        },
                        limit=1
                    )
                    if price_doc:
                        computed_rate = price_doc[0].price_list_rate
                if not computed_rate:
                    item_doc = frappe.get_doc("Item", item_row.item_code)
                    computed_rate = item_doc.standard_rate or 0
            item_row.price_list_rate = flt(computed_rate)
            item_row.rate = flt(computed_rate)
            item_row.amount = flt(item_row.qty) * flt(item_row.rate)
            
            # Optional item fields
            if item_data.get("item_name"):
                item_row.item_name = item_data.get("item_name")
            if item_data.get("description"):
                item_row.description = item_data.get("description")
            if item_data.get("uom"):
                item_row.uom = item_data.get("uom")
            if item_data.get("warehouse"):
                item_row.warehouse = item_data.get("warehouse")
            if item_data.get("delivery_date"):
                item_row.delivery_date = item_data.get("delivery_date")
            if item_data.get("item_tax_template"):
                item_row.item_tax_template = item_data.get("item_tax_template")
            
            # Intentionally ignore client-sent discounts for public endpoint
        
        # Do not apply document-level discounts from client on public endpoint
        
        # Insert the document
        quotation.insert(ignore_permissions=True)
        
        # Save the quotation (don't auto-submit)
        # quotation.submit()  # Quotations typically need manual review before submission
        
        # Calculate totals with VAT
        total_amount = flt(quotation.net_total or quotation.total or 0)
        vat_amount = total_amount * 0.15  # 15% VAT
        grand_total_with_vat = total_amount + vat_amount
        
        return {
            "success": True, 
            "message": f"Quotation {quotation.name} created successfully!",
            "quotation_name": quotation.name,
            "data": {
                "name": quotation.name,
                "customer": quotation.party_name,
                "total_amount": total_amount,
                "vat_amount": vat_amount,
                "grand_total": grand_total_with_vat,
                "status": quotation.status,
                "custom_payment_mode": quotation_data.get("custom_payment_mode")
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating quotation: {str(e)}", "Quotation Form - Create Quotation")
        return {"success": False, "message": f"Error creating quotation: {str(e)}"}

@frappe.whitelist()
def get_master_data():
    """Get all master data in one API call for better performance"""
    try:
        # Get all master data
        customers_result = get_customers()
        companies_result = get_companies()
        items_result = get_items()
        warehouses_result = get_warehouses()
        territories_result = get_territories()
        customer_groups_result = get_customer_groups()
        price_lists_result = get_price_lists()
        cities_result = get_cities()
        neighborhoods_result = get_neighborhoods()
        # cleaning_teams_result = get_cleaning_teams()  # Temporarily disabled
        
        return {
            "success": True,
            "data": {
                "customers": customers_result.get("data", []) if customers_result.get("success") else [],
                "companies": companies_result.get("data", []) if companies_result.get("success") else [],
                "items": items_result.get("data", []) if items_result.get("success") else [],
                "warehouses": warehouses_result.get("data", []) if warehouses_result.get("success") else [],
                "territories": territories_result.get("data", []) if territories_result.get("success") else [],
                "customer_groups": customer_groups_result.get("data", []) if customer_groups_result.get("success") else [],
                "price_lists": price_lists_result.get("data", []) if price_lists_result.get("success") else [],
                "cities": cities_result.get("data", []) if cities_result.get("success") else [],
                "neighborhoods": neighborhoods_result.get("data", []) if neighborhoods_result.get("success") else [],
                "cleaning_teams": []  # Temporarily disabled
            }
        }
    except Exception as e:
        frappe.log_error(f"Error fetching master data: {str(e)}", "Quotation Form - Get Master Data")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def validate_quotation_data(quotation_data):
    """Validate sales order data before creation"""
    try:
        if isinstance(quotation_data, str):
            quotation_data = json.loads(quotation_data)
        
        errors = []
        
        # Check required fields
        if not quotation_data.get("customer"):
            errors.append("Customer is required")
        
        if not quotation_data.get("company"):
            errors.append("Company is required")
        
        if not quotation_data.get("items") or len(quotation_data.get("items", [])) == 0:
            errors.append("At least one item is required")
        
        # Validate items
        for i, item in enumerate(quotation_data.get("items", [])):
            if not item.get("item_code"):
                errors.append(f"Item code is required for item {i+1}")
            if not item.get("qty") or flt(item.get("qty")) <= 0:
                errors.append(f"Valid quantity is required for item {i+1}")
            if not item.get("rate") or flt(item.get("rate")) < 0:
                errors.append(f"Valid rate is required for item {i+1}")
        
        # Check if customer exists
        if quotation_data.get("customer"):
            if not frappe.db.exists("Customer", quotation_data.get("customer")):
                errors.append("Selected customer does not exist")
        
        # Check if company exists
        if quotation_data.get("company"):
            if not frappe.db.exists("Company", quotation_data.get("company")):
                errors.append("Selected company does not exist")
        
        return {
            "success": len(errors) == 0,
            "errors": errors,
            "message": "; ".join(errors) if errors else "Validation successful"
        }
        
    except Exception as e:
        frappe.log_error(f"Error validating sales order data: {str(e)}", "Quotation Form - Validate Data")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_customer_email(customer_name):
    """Get customer email from multiple sources"""
    try:
        if not customer_name:
            return {"success": False, "message": "Customer name is required"}
        
        customer_email = None
        
        # Method 1: Check if customer has direct email_id field
        customer_doc = frappe.get_doc("Customer", customer_name)
        if hasattr(customer_doc, 'email_id') and customer_doc.email_id:
            customer_email = customer_doc.email_id
        
        # Method 2: Get from linked contacts (check email_ids child table)
        if not customer_email:
            contacts = frappe.get_all(
                "Dynamic Link",
                fields=["parent"],
                filters={
                    "link_doctype": "Customer",
                    "link_name": customer_name,
                    "parenttype": "Contact"
                }
            )
            
            for contact_link in contacts:
                contact_doc = frappe.get_doc("Contact", contact_link.parent)
                # Check email_ids child table first
                if contact_doc.email_ids:
                    for email_row in contact_doc.email_ids:
                        if email_row.email_id:
                            customer_email = email_row.email_id
                            break
                # Fallback to direct email_id field
                elif hasattr(contact_doc, 'email_id') and contact_doc.email_id:
                    customer_email = contact_doc.email_id
                
                if customer_email:
                    break
        
        # Method 3: Direct query from Contact Email child table
        if not customer_email:
            contact_emails = frappe.db.sql("""
                SELECT ce.email_id 
                FROM `tabContact Email` ce
                INNER JOIN `tabContact` c ON c.name = ce.parent
                INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name
                WHERE dl.link_doctype = 'Customer' 
                AND dl.link_name = %s 
                AND ce.email_id IS NOT NULL 
                AND ce.email_id != ''
                ORDER BY ce.is_primary DESC, c.creation DESC
                LIMIT 1
            """, (customer_name,))
            
            if contact_emails:
                customer_email = contact_emails[0][0]
        
        if customer_email:
            return {"success": True, "email": customer_email}
        else:
            return {"success": False, "message": "No email found for this customer"}
            
    except Exception as e:
        frappe.log_error(f"Error getting customer email: {str(e)}", "Quotation Form - Get Customer Email")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def send_quotation_email(quotation_name, customer_name=None, customer_email=None):
    """Send Quotation PDF via email"""
    try:
        if not quotation_name:
            return {"success": False, "message": "Quotation name is required"}
        
        # If no email provided, try to get it from customer
        if not customer_email and customer_name:
            email_result = get_customer_email(customer_name)
            if email_result.get("success"):
                customer_email = email_result.get("email")
            else:
                return {"success": False, "message": "Customer email not found. Please add email to customer master data."}
        
        if not customer_email:
            return {"success": False, "message": "Customer email is required"}
        
        # Check if Quotation exists
        if not frappe.db.exists("Quotation", quotation_name):
            return {"success": False, "message": "Quotation not found"}
        
        # Get Quotation document
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        # Get customer name (party_name for Quotation)
        customer_display_name = quotation.party_name or customer_name or "Customer"
        
        # Prepare email content
        subject = f"Quotation {quotation_name} - {customer_display_name}"
        message = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2c5aa0;">Quotation Confirmation</h2>
            <p>Dear {customer_display_name},</p>
            <p>Thank you for your interest! Please find attached your Quotation <strong>{quotation_name}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5aa0;">Quotation Summary:</h3>
                <p><strong>Quotation Date:</strong> {quotation.transaction_date}</p>
                <p><strong>Total Amount:</strong> {quotation.currency} {quotation.grand_total:,.2f}</p>
                {f"<p><strong>Valid Till:</strong> {quotation.valid_till}</p>" if quotation.valid_till else ""}
            </div>
            
            <p>If you have any questions about this quotation, please don't hesitate to contact us.</p>
            
            <p>We look forward to serving you!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0;"><strong>Sage Services Co Ltd</strong></p>
                <p style="margin: 5px 0; color: #666;">Your trusted business partner</p>
            </div>
        </div>
        """
        
        # Create communication record and send email
        from frappe.core.doctype.communication.email import make
        
        # Simple email sending with proper permissions
        try:
            # Generate PDF
            pdf_content = frappe.get_print("Quotation", quotation_name, "Standard", as_pdf=True)
            
            # Send email using frappe.sendmail with proper context
            frappe.sendmail(
                recipients=[customer_email],
                subject=subject,
                message=message,
                reference_doctype="Quotation",
                reference_name=quotation_name,
                attachments=[{
                    "fname": f"{quotation_name}.pdf",
                    "fcontent": pdf_content
                }]
            )
            
        except Exception as email_error:
            raise Exception(f"Email sending failed: {str(email_error)}")
        
        return {
            "success": True,
            "message": f"Quotation PDF has been sent to {customer_email}"
        }
        
    except Exception as e:
        frappe.log_error(f"Error sending quotation email: {str(e)}", "Quotation Form - Send Email")
        return {"success": False, "message": f"Error sending email: {str(e)}"}

@frappe.whitelist()
def test_email_retrieval(customer_name):
    """Simple test to check if we can find customer email"""
    try:
        email_result = get_customer_email(customer_name)
        return {
            "success": True,
            "customer_name": customer_name,
            "email_found": email_result.get("success", False),
            "email_address": email_result.get("email", "Not found"),
            "message": email_result.get("message", "")
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def debug_customer_email(customer_name):
    """Debug method to check customer email retrieval"""
    try:
        result = {
            "customer_name": customer_name,
            "methods_tried": [],
            "email_found": None
        }
        
        # Method 1: Direct customer email
        try:
            customer_doc = frappe.get_doc("Customer", customer_name)
            if hasattr(customer_doc, 'email_id') and customer_doc.email_id:
                result["methods_tried"].append(f"Direct customer email: {customer_doc.email_id}")
                result["email_found"] = customer_doc.email_id
        except Exception as e:
            result["methods_tried"].append(f"Direct customer email failed: {str(e)}")
        
        # Method 2: Dynamic Link approach
        try:
            contacts = frappe.get_all(
                "Dynamic Link",
                fields=["parent"],
                filters={
                    "link_doctype": "Customer",
                    "link_name": customer_name,
                    "parenttype": "Contact"
                }
            )
            result["methods_tried"].append(f"Found {len(contacts)} contact links")
            
            for contact_link in contacts:
                contact_doc = frappe.get_doc("Contact", contact_link.parent)
                # Check email_ids child table
                if contact_doc.email_ids:
                    for email_row in contact_doc.email_ids:
                        result["methods_tried"].append(f"Contact {contact_link.parent} email_ids: {email_row.email_id} (primary: {email_row.is_primary})")
                        if email_row.email_id and not result["email_found"]:
                            result["email_found"] = email_row.email_id
                # Check direct email field
                if hasattr(contact_doc, 'email_id') and contact_doc.email_id:
                    result["methods_tried"].append(f"Contact {contact_link.parent} direct email: {contact_doc.email_id}")
                    if not result["email_found"]:
                        result["email_found"] = contact_doc.email_id
        except Exception as e:
            result["methods_tried"].append(f"Dynamic Link approach failed: {str(e)}")
        
        # Method 3: Direct SQL query from child table
        try:
            contact_emails = frappe.db.sql("""
                SELECT c.name, ce.email_id, ce.is_primary
                FROM `tabContact Email` ce
                INNER JOIN `tabContact` c ON c.name = ce.parent
                INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name
                WHERE dl.link_doctype = 'Customer' 
                AND dl.link_name = %s 
                ORDER BY ce.is_primary DESC, c.creation DESC
            """, (customer_name,), as_dict=True)
            
            result["methods_tried"].append(f"SQL query found {len(contact_emails)} contact emails")
            for contact in contact_emails:
                result["methods_tried"].append(f"SQL Contact {contact.name}: email={contact.email_id} (primary: {contact.is_primary})")
                if contact.email_id and not result["email_found"]:
                    result["email_found"] = contact.email_id
        except Exception as e:
            result["methods_tried"].append(f"SQL query failed: {str(e)}")
        
        return {"success": True, "debug_info": result}
        
    except Exception as e:
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def create_customer(customer_data):
    """Create a new customer in ERPNext"""
    try:
        # Parse the JSON data if it's a string
        if isinstance(customer_data, str):
            customer_data = json.loads(customer_data)
        
        # Validate required fields
        if not customer_data.get("customer_name"):
            return {"success": False, "message": "Customer name is required"}
        
        # Create new Customer document
        customer = frappe.new_doc("Customer")
        
        # Set basic fields
        customer.customer_name = customer_data.get("customer_name")
        customer.customer_type = customer_data.get("customer_type", "Company")
        customer.customer_group = customer_data.get("customer_group", "All Customer Groups")
        customer.territory = customer_data.get("territory", "All Territories")
        
        # Insert the customer document
        customer.insert(ignore_permissions=True)
        
        # Create address if address information is provided
        if any([customer_data.get("address_line1"), customer_data.get("neighborhood"), customer_data.get("city"), customer_data.get("state")]):
            address = frappe.new_doc("Address")
            address.address_title = customer.customer_name
            address.address_type = "Billing"
            address.address_line1 = customer_data.get("address_line1", "")
            address.address_line2 = customer_data.get("neighborhood", "")  # Store neighborhood in address_line2
            address.city = customer_data.get("city", "")
            address.state = customer_data.get("state", "")
            address.country = customer_data.get("country", "Saudi Arabia")
            address.pincode = customer_data.get("pincode", "")
            
            # Link address to customer
            address.append("links", {
                "link_doctype": "Customer",
                "link_name": customer.name
            })
            
            address.insert(ignore_permissions=True)
        
        # Create contact if contact information is provided
        contact_created = False
        contact_name = None
        if any([customer_data.get("mobile_no"), customer_data.get("email_id")]):
            try:
                contact = frappe.new_doc("Contact")
                contact.first_name = customer.customer_name
                
                # Add email to email_ids child table (not direct email_id field)
                if customer_data.get("email_id"):
                    contact.append("email_ids", {
                        "email_id": customer_data.get("email_id"),
                        "is_primary": 1
                    })
                
                # Add phone to phone_nos child table
                if customer_data.get("mobile_no"):
                    contact.append("phone_nos", {
                        "phone": customer_data.get("mobile_no"),
                        "is_primary_mobile_no": 1
                    })
                
                # Link contact to customer
                contact.append("links", {
                    "link_doctype": "Customer",
                    "link_name": customer.name
                })
                
                contact.insert(ignore_permissions=True)
                contact_created = True
                contact_name = contact.name
                
                # Commit the contact to database first
                frappe.db.commit()
                
                # Update the customer to set primary contact
                if contact_created:
                    # Reload customer to ensure we have the latest data
                    customer.reload()
                    
                    # Set primary contact fields
                    customer.customer_primary_contact = contact.name
                    customer.mobile_no = customer_data.get("mobile_no")
                    customer.email_id = customer_data.get("email_id")
                    
                    # Save the customer to trigger all validations and computed fields
                    customer.save(ignore_permissions=True)
                    
                    # Commit again to ensure everything is saved
                    frappe.db.commit()
                
                frappe.log_error(f"Contact created successfully for customer {customer.name}: {contact.name} with email {customer_data.get('email_id')}", "Customer Creation Debug")
                
            except Exception as contact_error:
                frappe.log_error(f"Error creating contact for customer {customer.name}: {str(contact_error)}", "Customer Creation - Contact Error")
                # Don't fail the entire customer creation if contact fails
        
        return {
            "success": True,
            "message": f"Customer {customer.name} created successfully!" + (f" Contact created: {contact_created}" if contact_created else " No contact created"),
            "customer_name": customer.customer_name,
            "data": {
                "name": customer.name,
                "customer_name": customer.customer_name,
                "customer_type": customer.customer_type,
                "customer_group": customer.customer_group,
                "territory": customer.territory,
                "contact_created": contact_created,
                "contact_name": contact_name,
                "email_provided": customer_data.get("email_id", ""),
                "mobile_provided": customer_data.get("mobile_no", ""),
                "primary_contact_set": contact_created
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating customer: {str(e)}", "Quotation Form - Create Customer")
        return {"success": False, "message": f"Error creating customer: {str(e)}"}

@frappe.whitelist()
def get_cleaning_teams():
    """Get list of cleaning teams for the dropdown - temporarily disabled"""
    """
    try:
        teams = frappe.get_all(
            "Cleaning Team",
            fields=["name", "name1"],
            order_by="name asc"
        )
        return {"success": True, "data": teams}
    except Exception as e:
        frappe.log_error(f"Error fetching cleaning teams: {str(e)}", "Quotation Form - Get Cleaning Teams")
        return {"success": False, "message": str(e)}
    """
    return {"success": True, "data": []}





@frappe.whitelist()
def download_quotation_pdf(quotation_name):
    """Generate and return Quotation PDF in Standard format"""
    try:
        if not quotation_name:
            return {"success": False, "message": "Quotation name is required"}
        
        # Check if Quotation exists
        if not frappe.db.exists("Quotation", quotation_name):
            return {"success": False, "message": "Quotation not found"}
        
        # Generate PDF
        import base64
        pdf_content = frappe.get_print("Quotation", quotation_name, "Standard", as_pdf=True)
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
        
        return {
            "success": True,
            "pdf_content": pdf_base64,
            "filename": f"{quotation_name}.pdf"
        }
        
    except Exception as e:
        frappe.log_error(f"Error generating sales order PDF: {str(e)}", "Quotation Form - Download PDF")
        return {"success": False, "message": f"Error generating PDF: {str(e)}"}

@frappe.whitelist()
def get_cleaning_teams_list():
    """Get list of all cleaning teams for availability viewer"""
    try:
        teams = frappe.get_all(
            "Cleaning Team",
            fields=["name", "name1"],
            order_by="name asc"
        )
        return {"success": True, "data": teams}
    except Exception as e:
        frappe.log_error(f"Error fetching cleaning teams list: {str(e)}", "Quotation Form - Get Teams")
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_team_availability(team_name, date=None):
    """Get team availability for a specific date"""
    try:
        if not team_name:
            return {"success": False, "message": "Team name is required"}
        
        # Check if team exists
        if not frappe.db.exists("Cleaning Team", team_name):
            return {"success": False, "message": "Team not found"}
        
        # Get team document with shifts
        team_doc = frappe.get_doc("Cleaning Team", team_name)
        
        # Get shifts
        shifts = []
        if hasattr(team_doc, 'shifts') and team_doc.shifts:
            for shift in team_doc.shifts:
                shifts.append({
                    "start_time": shift.start_time,
                    "end_time": shift.end_time
                })
        
        # Use provided date or today
        from frappe.utils import nowdate
        target_date = date if date else nowdate()
        
        # Get appointments for this team on the target date using between filter
        appointments = frappe.get_all(
            "Service Appointment",
            fields=["name", "appointment_date_time", "appointment_end_time", "customer", "total_service_time"],
            filters={
                "service_team": team_name,
                "docstatus": ["!=", 2],  # Not cancelled
                "appointment_date_time": ["between", [target_date + " 00:00:00", target_date + " 23:59:59"]]
            }
        )
        
        # Get team members count
        team_members_count = len(team_doc.team_members) if hasattr(team_doc, 'team_members') and team_doc.team_members else 0
        
        return {
            "success": True,
            "data": {
                "team_name": team_doc.name1 if hasattr(team_doc, 'name1') else team_name,
                "team_id": team_name,
                "team_members_count": team_members_count,
                "shifts": shifts,
                "appointments": appointments,
                "date": target_date
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error fetching team availability: {str(e)}", "Quotation Form - Get Team Availability")
        return {"success": False, "message": str(e)}
