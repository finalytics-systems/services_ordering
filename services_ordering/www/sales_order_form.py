import frappe
from frappe import _
from frappe.utils import nowdate, flt, cint
import json


@frappe.whitelist(allow_guest=True)
def test_connection():
    """Simple test function to verify backend connectivity"""
    return {"success": True, "message": "Backend connection successful!", "timestamp": frappe.utils.now()}

@frappe.whitelist(allow_guest=True)
def get_customers():
    """Get list of customers for the dropdown"""
    try:
        customers = frappe.get_all(
            "Customer",
            fields=["name", "customer_name", "customer_group", "territory", "customer_type"],
            filters={"disabled": 0},
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
        items = frappe.get_all(
            "Item",
            fields=[
                "name", "item_name", "description", "stock_uom", 
                "standard_rate", "item_group", "brand", "has_variants"
            ],
            filters={
                "disabled": 0,
                "is_sales_item": 1,
                "has_variants": 0  # Exclude template items
            },
            order_by="item_name asc",
            limit=500
        )
        return {"success": True, "data": items}
    except Exception as e:
        frappe.log_error(f"Error fetching items: {str(e)}", "Sales Order Form - Get Items")
        return {"success": False, "message": str(e)}

@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching warehouses: {str(e)}", "Sales Order Form - Get Warehouses")
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
        frappe.log_error(f"Error fetching customer details: {str(e)}", "Sales Order Form - Get Customer Details")
        return {"success": False, "message": str(e)}

@frappe.whitelist(allow_guest=True)
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
        frappe.log_error(f"Error fetching item details: {str(e)}", "Sales Order Form - Get Item Details")
        return {"success": False, "message": str(e)}

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
        sales_order.company = "Sage Services Co Ltd."  # Static company
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
        
        # Handle new fields (time and team) - set only if they exist as custom fields
        if sales_order_data.get("time") and hasattr(sales_order, 'time'):
            sales_order.time = sales_order_data.get("time")
        if sales_order_data.get("team") and hasattr(sales_order, 'team'):
            sales_order.team = sales_order_data.get("team")
            
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
        
        # Taxes and charges
        if sales_order_data.get("taxes_and_charges"):
            sales_order.taxes_and_charges = sales_order_data.get("taxes_and_charges")
        
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
            
            # Intentionally ignore client-sent discounts for public endpoint
        
        # Do not apply document-level discounts from client on public endpoint
        
        # Insert the document
        sales_order.insert(ignore_permissions=True)
        
        # Submit if auto-submit is enabled (optional)
        # sales_order.submit()
        
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
                "status": sales_order.status
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating sales order: {str(e)}", "Sales Order Form - Create Sales Order")
        return {"success": False, "message": f"Error creating sales order: {str(e)}"}

@frappe.whitelist(allow_guest=True)
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
        
        return {
            "success": True,
            "data": {
                "customers": customers_result.get("data", []) if customers_result.get("success") else [],
                "companies": companies_result.get("data", []) if companies_result.get("success") else [],
                "items": items_result.get("data", []) if items_result.get("success") else [],
                "warehouses": warehouses_result.get("data", []) if warehouses_result.get("success") else [],
                "territories": territories_result.get("data", []) if territories_result.get("success") else [],
                "customer_groups": customer_groups_result.get("data", []) if customer_groups_result.get("success") else [],
                "price_lists": price_lists_result.get("data", []) if price_lists_result.get("success") else []
            }
        }
    except Exception as e:
        frappe.log_error(f"Error fetching master data: {str(e)}", "Sales Order Form - Get Master Data")
        return {"success": False, "message": str(e)}

@frappe.whitelist(allow_guest=True)
def validate_sales_order_data(sales_order_data):
    """Validate sales order data before creation"""
    try:
        if isinstance(sales_order_data, str):
            sales_order_data = json.loads(sales_order_data)
        
        errors = []
        
        # Check required fields
        if not sales_order_data.get("customer"):
            errors.append("Customer is required")
        
        if not sales_order_data.get("company"):
            errors.append("Company is required")
        
        if not sales_order_data.get("items") or len(sales_order_data.get("items", [])) == 0:
            errors.append("At least one item is required")
        
        # Validate items
        for i, item in enumerate(sales_order_data.get("items", [])):
            if not item.get("item_code"):
                errors.append(f"Item code is required for item {i+1}")
            if not item.get("qty") or flt(item.get("qty")) <= 0:
                errors.append(f"Valid quantity is required for item {i+1}")
            if not item.get("rate") or flt(item.get("rate")) < 0:
                errors.append(f"Valid rate is required for item {i+1}")
        
        # Check if customer exists
        if sales_order_data.get("customer"):
            if not frappe.db.exists("Customer", sales_order_data.get("customer")):
                errors.append("Selected customer does not exist")
        
        # Check if company exists
        if sales_order_data.get("company"):
            if not frappe.db.exists("Company", sales_order_data.get("company")):
                errors.append("Selected company does not exist")
        
        return {
            "success": len(errors) == 0,
            "errors": errors,
            "message": "; ".join(errors) if errors else "Validation successful"
        }
        
    except Exception as e:
        frappe.log_error(f"Error validating sales order data: {str(e)}", "Sales Order Form - Validate Data")
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
        if any([customer_data.get("address_line1"), customer_data.get("city"), customer_data.get("state")]):
            address = frappe.new_doc("Address")
            address.address_title = customer.customer_name
            address.address_type = "Billing"
            address.address_line1 = customer_data.get("address_line1", "")
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
        if any([customer_data.get("mobile_no"), customer_data.get("email_id")]):
            contact = frappe.new_doc("Contact")
            contact.first_name = customer.customer_name
            contact.mobile_no = customer_data.get("mobile_no", "")
            contact.email_id = customer_data.get("email_id", "")
            
            # Link contact to customer
            contact.append("links", {
                "link_doctype": "Customer",
                "link_name": customer.name
            })
            
            contact.insert(ignore_permissions=True)
        
        return {
            "success": True,
            "message": f"Customer {customer.name} created successfully!",
            "customer_name": customer.customer_name,
            "data": {
                "name": customer.name,
                "customer_name": customer.customer_name,
                "customer_type": customer.customer_type,
                "customer_group": customer.customer_group,
                "territory": customer.territory
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating customer: {str(e)}", "Sales Order Form - Create Customer")
        return {"success": False, "message": f"Error creating customer: {str(e)}"}
