import frappe
from frappe import _
from frappe.utils import nowdate, flt, cint
import json


@frappe.whitelist(allow_guest=True, methods=['GET', 'POST'])
def test_connection():
    """Simple test function to verify backend connectivity"""
    return {"success": True, "message": "Backend connection successful!", "timestamp": frappe.utils.now()}


@frappe.whitelist(allow_guest=True)
def get_master_data():
    """Get all master data in one API call for better performance"""
    try:
        # Get all master data
        customers_result = get_customers()
        companies_result = get_companies()
        items_result = get_items()
        territories_result = get_territories()
        customer_groups_result = get_customer_groups()
        price_lists_result = get_price_lists()
        cities_result = get_cities()
        neighborhoods_result = get_neighborhoods()
        cleaning_teams_result = get_cleaning_teams_list()
        
        return {
            "success": True,
            "data": {
                "customers": customers_result.get("data", []) if customers_result.get("success") else [],
                "companies": companies_result.get("data", []) if companies_result.get("success") else [],
                "items": items_result.get("data", []) if items_result.get("success") else [],
                "territories": territories_result.get("data", []) if territories_result.get("success") else [],
                "customer_groups": customer_groups_result.get("data", []) if customer_groups_result.get("success") else [],
                "price_lists": price_lists_result.get("data", []) if price_lists_result.get("success") else [],
                "cities": cities_result.get("data", []) if cities_result.get("success") else [],
                "neighborhoods": neighborhoods_result.get("data", []) if neighborhoods_result.get("success") else [],
                "cleaning_teams": cleaning_teams_result.get("data", []) if cleaning_teams_result.get("success") else []
            }
        }
    except Exception as e:
        frappe.log_error(f"Error fetching master data: {str(e)}", "Sales Order Form - Get Master Data")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching customers: {str(e)}", "Sales Order Form - Get Customers")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching companies: {str(e)}", "Sales Order Form - Get Companies")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        return {"success": True, "data": items}
    except Exception as e:
        frappe.log_error(f"Error fetching items: {str(e)}", "Sales Order Form - Get Items")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching territories: {str(e)}", "Sales Order Form - Get Territories")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching customer groups: {str(e)}", "Sales Order Form - Get Customer Groups")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching price lists: {str(e)}", "Sales Order Form - Get Price Lists")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching cities: {str(e)}", "Sales Order Form - Get Cities")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching neighborhoods: {str(e)}", "Sales Order Form - Get Neighborhoods")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching cleaning teams list: {str(e)}", "Sales Order Form - Get Teams")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching team availability: {str(e)}", "Sales Order Form - Get Team Availability")
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error creating customer: {str(e)}", "Sales Order Form - Create Customer")
        return {"success": False, "message": f"Error creating customer: {str(e)}"}


@frappe.whitelist(allow_guest=True)
def create_sales_order(sales_order_data):
    """Create a new sales order in ERPNext"""
    try:
        # Parse the JSON data if it's a string
        if isinstance(sales_order_data, str):
            sales_order_data = json.loads(sales_order_data)
        
        # Validate required fields
        if not sales_order_data.get("customer"):
            return {"success": False, "message": "Customer is required"}
        
        if not sales_order_data.get("items") or len(sales_order_data.get("items", [])) == 0:
            return {"success": False, "message": "At least one item is required"}
        
        # Create new Sales Order document
        sales_order = frappe.new_doc("Sales Order")
        
        # Set basic fields with static values
        sales_order.customer = sales_order_data.get("customer")
        sales_order.company = "Sage Services Co Ltd"  # Static company
        sales_order.currency = "SAR"  # Static currency
        sales_order.transaction_date = sales_order_data.get("transaction_date", nowdate())
        sales_order.delivery_date = sales_order_data.get("delivery_date")
        pl_candidate = sales_order_data.get("selling_price_list") or sales_order_data.get("price_list")
        valid_price_list = None
        if pl_candidate and frappe.db.exists("Price List", {"name": pl_candidate, "enabled": 1, "selling": 1}):
            valid_price_list = pl_candidate
            sales_order.selling_price_list = pl_candidate
        
        # Optional fields
        if sales_order_data.get("customer_group"):
            sales_order.customer_group = sales_order_data.get("customer_group")
        if sales_order_data.get("territory"):
            sales_order.territory = sales_order_data.get("territory")
        if sales_order_data.get("order_type"):
            sales_order.order_type = sales_order_data.get("order_type", "Sales")
        
        # Handle new fields (time and team)
        if sales_order_data.get("custom_time"):
            sales_order.custom_time = sales_order_data.get("custom_time")
            print(f"Setting custom_time to {sales_order_data.get('custom_time')}")
            frappe.log_error(f"Setting custom_time to {sales_order_data.get('custom_time')}", "Sales Order Form - Custom Time")
            
        if sales_order_data.get("team"):
            sales_order.custom_team = sales_order_data.get("team")
            print(f"Setting custom_team to {sales_order_data.get('team')}")
            frappe.log_error(f"Setting custom_team to {sales_order_data.get('team')}", "Sales Order Form - Custom Team")
            
        if sales_order_data.get("source"):
            sales_order.source = sales_order_data.get("source")
        if sales_order_data.get("project"):
            sales_order.project = sales_order_data.get("project")
        if sales_order_data.get("cost_center"):
            sales_order.cost_center = sales_order_data.get("cost_center")
        
        # Address and contact details
        if sales_order_data.get("customer_address"):
            sales_order.customer_address = sales_order_data.get("customer_address")
        if sales_order_data.get("shipping_address_name"):
            sales_order.shipping_address_name = sales_order_data.get("shipping_address_name")
        if sales_order_data.get("contact_person"):
            sales_order.contact_person = sales_order_data.get("contact_person")
        
        # Terms and conditions
        if sales_order_data.get("tc_name"):
            sales_order.tc_name = sales_order_data.get("tc_name")
        if sales_order_data.get("terms"):
            sales_order.terms = sales_order_data.get("terms")
        
        # Payment terms
        if sales_order_data.get("payment_terms_template"):
            sales_order.payment_terms_template = sales_order_data.get("payment_terms_template")
        
        # Always add the tax row directly
        tax_row = sales_order.append("taxes", {})
        tax_row.charge_type = "On Net Total"
        tax_row.account_head = "KSA VAT15% - SSC"
        tax_row.description = "VAT 15%"
        tax_row.rate = 15
        
        # Shipping
        if sales_order_data.get("shipping_rule"):
            sales_order.shipping_rule = sales_order_data.get("shipping_rule")
        
        # Add items
        for item_data in sales_order_data.get("items", []):
            if not item_data.get("item_code") or not item_data.get("qty"):
                continue
                
            item_row = sales_order.append("items", {})
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
        
        # Insert the document
        sales_order.insert(ignore_permissions=True)
        
        # Submit if auto-submit is enabled (optional)
        sales_order.submit()
        
        # Calculate totals with VAT
        total_amount = flt(sales_order.net_total or sales_order.total or 0)
        vat_amount = total_amount * 0.15  # 15% VAT
        grand_total_with_vat = total_amount + vat_amount
        
        return {
            "success": True, 
            "message": f"Sales Order {sales_order.name} created successfully!",
            "sales_order_name": sales_order.name,
            "data": {
                "name": sales_order.name,
                "customer": sales_order.customer,
                "total_amount": total_amount,
                "vat_amount": vat_amount,
                "grand_total": grand_total_with_vat,
                "status": sales_order.status,
                "custom_time": sales_order_data.get("custom_time"),
                "custom_team": sales_order_data.get("team")
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating sales order: {str(e)}", "Sales Order Form - Create Sales Order")
        return {"success": False, "message": f"Error creating sales order: {str(e)}"}
