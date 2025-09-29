import frappe

def calculate_total_service_time(doc, method):
    total_time = 0
    for item in doc.items:
        service_time = item.get('custom_service_time') or 0
        gap_time = item.get('custom_gap_time') or 0
        total_time += service_time + gap_time
    
    doc.custom_total_service_time = total_time