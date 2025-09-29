app_name = "services_ordering"
app_title = "Services Ordering"
app_publisher = "Haris"
app_description = "Simple app to manage services ordering in ERPNext"
app_email = "haris@finalytics.tech"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "services_ordering",
# 		"logo": "/assets/services_ordering/logo.png",
# 		"title": "Services Ordering",
# 		"route": "/services_ordering",
# 		"has_permission": "services_ordering.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/services_ordering/css/services_ordering.css"
# app_include_js = "/assets/services_ordering/js/services_ordering.js"

# include js, css files in header of web template
# web_include_css = "/assets/services_ordering/css/services_ordering.css"
# web_include_js = "/assets/services_ordering/js/services_ordering.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "services_ordering/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "services_ordering/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "services_ordering.utils.jinja_methods",
# 	"filters": "services_ordering.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "services_ordering.install.before_install"
# after_install = "services_ordering.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "services_ordering.uninstall.before_uninstall"
# after_uninstall = "services_ordering.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "services_ordering.utils.before_app_install"
# after_app_install = "services_ordering.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "services_ordering.utils.before_app_uninstall"
# after_app_uninstall = "services_ordering.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "services_ordering.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Sales Order": {
		"validate": "services_ordering.utils.calculate_total_service_time",
	}
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"services_ordering.tasks.all"
# 	],
# 	"daily": [
# 		"services_ordering.tasks.daily"
# 	],
# 	"hourly": [
# 		"services_ordering.tasks.hourly"
# 	],
# 	"weekly": [
# 		"services_ordering.tasks.weekly"
# 	],
# 	"monthly": [
# 		"services_ordering.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "services_ordering.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "services_ordering.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "services_ordering.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["services_ordering.utils.before_request"]
# after_request = ["services_ordering.utils.after_request"]

# Job Events
# ----------
# before_job = ["services_ordering.utils.before_job"]
# after_job = ["services_ordering.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"services_ordering.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

