// Sales Order Form - Modern Vue.js Implementation
frappe.ready(function() {
	console.log('Sales Order Form loading...');
	
	// Load Tailwind CSS
	console.log('Loading Tailwind CSS...');
	let tailwindLink = document.createElement("link");
	tailwindLink.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
	tailwindLink.rel = "stylesheet";
	tailwindLink.onerror = function() {
		console.error('Failed to load Tailwind CSS');
		frappe.msgprint('Failed to load Tailwind CSS. Some styling may not work properly.');
	};
	document.head.appendChild(tailwindLink);
	console.log('Tailwind CSS loaded');

	// Create app container
	$('body').append('<div id="sales-order-app"></div>');
	console.log('App div added to body');

	// Load Vue.js
	console.log('Loading Vue.js...');
	let vueScript = document.createElement("script");
	vueScript.src = "https://unpkg.com/vue@3/dist/vue.global.js";
	vueScript.onerror = function() {
		console.error('Failed to load Vue.js');
		frappe.msgprint('Failed to load Vue.js. Please check your internet connection.');
	};
	vueScript.onload = function() {
		console.log('Vue script loaded, Vue object:', Vue);
				try {
			console.log('Starting Vue app creation...');
			const { createApp, ref, onMounted, computed } = Vue;
			console.log('Vue destructured successfully');

			const app = createApp({
				setup() {
					console.log('Vue setup function called');
					console.log('Vue object:', Vue);
					console.log('createApp function:', createApp);
					
					// Form data
					const salesOrder = ref({
						customer: '',
						customer_name: '',
						transaction_date: new Date().toISOString().split('T')[0],
						delivery_date: '',
						currency: 'SAR',
						selling_price_list: 'Standard Selling',
						company: 'Sage Services Co Ltd.',
						time: '',
						team: '',
						cost_center: '',
						project: '',
						order_type: 'Sales',
						source: 'Direct',
						territory: '',
						customer_group: '',
						payment_terms_template: '',
						tc_name: '',
						terms: '',
						apply_discount_on: 'Grand Total',
						additional_discount_percentage: 0,
						discount_amount: 0,
						taxes_and_charges: '',
						shipping_rule: '',
						incoterm: '',
						named_place: '',
						customer_address: '',
						shipping_address_name: '',
						contact_person: '',
						contact_display: '',
						contact_mobile: '',
						contact_email: ''
					});

					const items = ref([]);
					const loading = ref(false);
					const saving = ref(false);
					const sendingEmail = ref(false);
					const lastCreatedSalesOrder = ref(null);
					const showSuccessMessage = ref(false);
					const successMessage = ref('');
					const customers = ref([]);
					const companies = ref([]);
					const territories = ref([]);
					const customerGroups = ref([]);
					const paymentTerms = ref([]);
					const taxTemplates = ref([]);
					const shippingRules = ref([]);
					const priceLists = ref([]);
					const itemsList = ref([]);
					const warehouses = ref([]);
					const costCenters = ref([]);
					const projects = ref([]);

					// Add new item to the items list
					const addItem = () => {
						items.value.push({
							item_code: '',
							item_name: '',
							description: '',
							qty: 1,
							uom: 'Nos',
							rate: 0,
							amount: 0,
							warehouse: '',
							delivery_date: salesOrder.value.delivery_date,
							item_tax_template: '',
							discount_percentage: 0,
							discount_amount: 0,
							net_rate: 0,
							net_amount: 0
						});
					};

					// Remove item from the list
					const removeItem = (index) => {
						items.value.splice(index, 1);
						calculateTotals();
					};

					// Calculate item amount
					const calculateItemAmount = (item) => {
						const rate = parseFloat(item.rate) || 0;
						const qty = parseFloat(item.qty) || 0;
						const discountPercentage = parseFloat(item.discount_percentage) || 0;
						const discountAmount = parseFloat(item.discount_amount) || 0;
						
						item.amount = rate * qty;
						
						// Apply discount
						if (discountPercentage > 0) {
							item.discount_amount = (item.amount * discountPercentage) / 100;
						}
						
						item.net_amount = item.amount - (parseFloat(item.discount_amount) || 0);
						item.net_rate = qty > 0 ? item.net_amount / qty : 0;
						
						// Force reactivity update
						items.value = [...items.value];
					};

					// Calculate totals
					const calculateTotals = () => {
						if (!items.value || items.value.length === 0) return 0;
						const total = items.value.reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0);
						return total;
					};

					// Computed properties
					const totalAmount = computed(() => {
						if (!items.value || items.value.length === 0) return 0;
						const total = items.value.reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0);
						console.log('Total Amount calculated:', total);
						return total;
					});
					const vatAmount = computed(() => {
						const total = totalAmount.value || 0;
						const vat = total * 0.15;
						console.log('VAT Amount calculated:', vat, 'from total:', total);
						return vat;
					});
					const grandTotal = computed(() => {
						const grand = (totalAmount.value || 0) + (vatAmount.value || 0);
						console.log('Grand Total calculated:', grand);
						return grand;
					});

					// Fetch master data
					const fetchMasterData = async () => {
						try {
							loading.value = true;
							
							// Fetch customers
							const customerResponse = await frappe.call({
								method: "frappe.client.get_list",
								args: {
									doctype: "Customer",
									fields: ["name", "customer_name", "customer_group", "territory"],
									limit_page_length: 100
								}
							});
							if (customerResponse.message) {
								customers.value = customerResponse.message;
							}

							// Fetch companies
							const companyResponse = await frappe.call({
								method: "frappe.client.get_list",
								args: {
									doctype: "Company",
									fields: ["name", "company_name"],
									limit_page_length: 50
								}
							});
							if (companyResponse.message) {
								companies.value = companyResponse.message;
							}

							// Fetch territories
							const territoryResponse = await frappe.call({
								method: "frappe.client.get_list",
								args: {
									doctype: "Territory",
									fields: ["name"],
									limit_page_length: 100
								}
							});
							if (territoryResponse.message) {
								territories.value = territoryResponse.message;
							}

							// Fetch customer groups
							const customerGroupResponse = await frappe.call({
								method: "frappe.client.get_list",
								args: {
									doctype: "Customer Group",
									fields: ["name"],
									limit_page_length: 100
								}
							});
							if (customerGroupResponse.message) {
								customerGroups.value = customerGroupResponse.message;
							}

							// Fetch items
							const itemResponse = await frappe.call({
								method: "frappe.client.get_list",
								args: {
									doctype: "Item",
									fields: ["name", "item_name", "description", "stock_uom", "standard_rate"],
									filters: [["is_sales_item", "=", 1]],
									limit_page_length: 200
								}
							});
							if (itemResponse.message) {
								itemsList.value = itemResponse.message;
							}

							// Fetch warehouses
							const warehouseResponse = await frappe.call({
								method: "frappe.client.get_list",
								args: {
									doctype: "Warehouse",
									fields: ["name"],
									limit_page_length: 100
								}
							});
							if (warehouseResponse.message) {
								warehouses.value = warehouseResponse.message;
							}

						} catch (error) {
							console.error('Error fetching master data:', error);
							frappe.msgprint('Error fetching master data: ' + error.message);
						} finally {
							loading.value = false;
						}
					};

					// Save Sales Order
					const saveSalesOrder = async () => {
						try {
							saving.value = true;
							
							if (!salesOrder.value.customer) {
								frappe.msgprint('Please select a customer');
								return;
							}
							
							if (items.value.length === 0) {
								frappe.msgprint('Please add at least one item');
								return;
							}

							const salesOrderData = {
								...salesOrder.value,
								items: items.value,
								doctype: 'Sales Order'
							};

							console.log('Saving sales order:', salesOrderData);

							const response = await frappe.call({
								method: "frappe.client.insert",
								args: {
									doc: salesOrderData
								}
							});

							if (response.message) {
								lastCreatedSalesOrder.value = response.message;
								
								// Show custom success message instead of frappe.msgprint
								successMessage.value = `Sales Order ${response.message.name} created successfully!`;
								showSuccessMessage.value = true;
								
								// Auto-hide success message after 5 seconds
								setTimeout(() => {
									showSuccessMessage.value = false;
								}, 5000);
								
								// Don't reset form - let user decide when to reset
							}

						} catch (error) {
							console.error('Error saving sales order:', error);
							
							// Show custom error message instead of frappe.msgprint
							successMessage.value = 'Error creating sales order: ' + error.message;
							showSuccessMessage.value = true;
							
							// Auto-hide error message after 5 seconds
							setTimeout(() => {
								showSuccessMessage.value = false;
							}, 5000);
						} finally {
							saving.value = false;
						}
					};

					// Reset form
					const resetForm = () => {
						salesOrder.value = {
							customer: '',
							customer_name: '',
							transaction_date: new Date().toISOString().split('T')[0],
							delivery_date: '',
							currency: 'SAR',
							selling_price_list: 'Standard Selling',
							company: 'Sage Services Co Ltd.',
							time: '',
							team: '',
							cost_center: '',
							project: '',
							order_type: 'Sales',
							source: 'Direct',
							territory: '',
							customer_group: '',
							payment_terms_template: '',
							tc_name: '',
							terms: '',
							apply_discount_on: 'Grand Total',
							additional_discount_percentage: 0,
							discount_amount: 0,
							taxes_and_charges: '',
							shipping_rule: '',
							incoterm: '',
							named_place: '',
							customer_address: '',
							shipping_address_name: '',
							contact_person: '',
							contact_display: '',
							contact_mobile: '',
							contact_email: ''
						};
						items.value = [];
						lastCreatedSalesOrder.value = null;
						showSuccessMessage.value = false;
					};

					// Send Email with PDF
					const sendEmail = async () => {
						try {
							sendingEmail.value = true;
							
							if (!lastCreatedSalesOrder.value) {
								frappe.msgprint('No Sales Order to send. Please create a Sales Order first.');
								return;
							}

							if (!salesOrder.value.customer) {
								frappe.msgprint('Customer information is missing.');
								return;
							}

							// Get customer email
							const customerResponse = await frappe.call({
								method: "frappe.client.get",
								args: {
									doctype: "Customer",
									name: salesOrder.value.customer
								}
							});

							let customerEmail = '';
							if (customerResponse.message && customerResponse.message.email_id) {
								customerEmail = customerResponse.message.email_id;
							} else {
								// Try to get email from contact
								const contactResponse = await frappe.call({
									method: "frappe.client.get_list",
									args: {
										doctype: "Contact",
										filters: [["Dynamic Link", "link_doctype", "=", "Customer"], ["Dynamic Link", "link_name", "=", salesOrder.value.customer]],
										fields: ["email_id"],
										limit_page_length: 1
									}
								});
								
								if (contactResponse.message && contactResponse.message.length > 0 && contactResponse.message[0].email_id) {
									customerEmail = contactResponse.message[0].email_id;
								}
							}

							if (!customerEmail) {
								frappe.msgprint('Customer email not found. Please add email to customer master data.');
								return;
							}

							// Send email with PDF attachment
							const emailResponse = await frappe.call({
								method: "frappe.core.doctype.communication.email.make",
								args: {
									recipients: customerEmail,
									subject: `Sales Order ${lastCreatedSalesOrder.value.name} - ${salesOrder.value.customer_name}`,
									content: `Dear ${salesOrder.value.customer_name},<br><br>
										Please find attached your Sales Order ${lastCreatedSalesOrder.value.name}.<br><br>
										Thank you for your business!<br><br>
										Best regards,<br>
										${salesOrder.value.company}`,
									doctype: "Sales Order",
									name: lastCreatedSalesOrder.value.name,
									send_email: 1,
									print_format: "Standard",
									attach_document_print: 1
								}
							});

							if (emailResponse.message) {
								// Show custom success message instead of frappe.msgprint
								successMessage.value = `Sales Order PDF has been sent to ${customerEmail}`;
								showSuccessMessage.value = true;
								
								// Auto-hide success message after 5 seconds
								setTimeout(() => {
									showSuccessMessage.value = false;
								}, 5000);
							}

						} catch (error) {
							console.error('Error sending email:', error);
							
							// Show custom error message instead of frappe.msgprint
							successMessage.value = 'Error sending email: ' + error.message;
							showSuccessMessage.value = true;
							
							// Auto-hide error message after 5 seconds
							setTimeout(() => {
								showSuccessMessage.value = false;
							}, 5000);
						} finally {
							sendingEmail.value = false;
						}
					};

					// Handle customer selection
					const onCustomerChange = () => {
						const selectedCustomer = customers.value.find(c => c.name === salesOrder.value.customer);
						if (selectedCustomer) {
							salesOrder.value.customer_name = selectedCustomer.customer_name;
							salesOrder.value.customer_group = selectedCustomer.customer_group;
							salesOrder.value.territory = selectedCustomer.territory;
						}
					};

					// Handle item selection
					const onItemChange = (item) => {
						const selectedItem = itemsList.value.find(i => i.name === item.item_code);
						if (selectedItem) {
							item.item_name = selectedItem.item_name;
							item.description = selectedItem.description;
							item.uom = selectedItem.stock_uom;
							item.rate = selectedItem.standard_rate || 0;
							calculateItemAmount(item);
						}
					};

					onMounted(() => {
						console.log('Vue onMounted called');
						
						// Inject CSS override for full width
						let salesOrderPageStyle = document.getElementById('rayacoltd-sales-order-style');
						if (!salesOrderPageStyle) {
							salesOrderPageStyle = document.createElement('style');
							salesOrderPageStyle.id = 'rayacoltd-sales-order-style';
							salesOrderPageStyle.textContent = `
								body { 
									margin: 0 !important; 
									padding: 0 !important;
									overflow-x: hidden !important;
								}
								#sales-order-app {
									width: 100vw !important;
									min-height: 100vh !important;
								}
							`;
							document.head.appendChild(salesOrderPageStyle);
							console.log('CSS override injected for sales order page');
						}
						
						fetchMasterData();
						addItem(); // Add first item by default
					});

					// Debug: Log computed properties
					console.log('Vue setup - totalAmount:', totalAmount);
					console.log('Vue setup - vatAmount:', vatAmount);
					console.log('Vue setup - grandTotal:', grandTotal);

					return {
						salesOrder,
						items,
						loading,
						saving,
						sendingEmail,
						lastCreatedSalesOrder,
						showSuccessMessage,
						successMessage,
						customers,
						companies,
						territories,
						customerGroups,
						itemsList,
						warehouses,
						totalAmount,
						vatAmount,
						grandTotal,
						addItem,
						removeItem,
						calculateItemAmount,
						saveSalesOrder,
						resetForm,
						sendEmail,
						onCustomerChange,
						onItemChange
					};
				},

				template: `
					<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
						<!-- Success/Error Message Popup -->
						<div v-if="showSuccessMessage" class="fixed top-4 right-4 z-50 max-w-md">
							<div class="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 flex items-center">
								<div class="flex-shrink-0">
									<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
									</svg>
								</div>
								<div class="ml-3 flex-1">
									<p class="text-sm font-medium text-gray-900">{{ successMessage }}</p>
								</div>
								<div class="ml-4 flex-shrink-0">
									<button @click="showSuccessMessage = false" class="text-gray-400 hover:text-gray-600">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
										</svg>
									</button>
								</div>
							</div>
						</div>

						<!-- Header Section -->
						<div class="max-w-7xl mx-auto">
							<div class="text-center mb-8">
								<h1 class="text-4xl font-bold text-gray-800 mb-2">Create Sales Order</h1>
								<p class="text-lg text-gray-600">Create and manage your sales orders with ease</p>
							</div>

							<!-- Loading State -->
							<div v-if="loading" class="text-center py-16">
								<div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
								<p class="mt-4 text-lg text-gray-600 font-medium">Loading form data...</p>
							</div>

							<!-- Main Form -->
							<div v-else class="space-y-8">
								<!-- Customer Information Card -->
								<div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
									<div class="flex items-center mb-6">
										<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
											<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
											</svg>
										</div>
										<div>
											<h2 class="text-2xl font-semibold text-gray-800">Customer Information</h2>
											<p class="text-sm text-gray-600">Select customer and basic order details</p>
										</div>
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
											<select 
												v-model="salesOrder.customer"
												@change="onCustomerChange"
												class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
												required
											>
												<option value="">Select Customer</option>
												<option v-for="customer in customers" :key="customer.name" :value="customer.name">
													{{ customer.customer_name }} ({{ customer.name }})
												</option>
											</select>
										</div>

										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Company *</label>
											<select 
												v-model="salesOrder.company"
												class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
												required
											>
												<option value="">Select Company</option>
												<option v-for="company in companies" :key="company.name" :value="company.name">
													{{ company.name }}
												</option>
											</select>
										</div>

										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Transaction Date *</label>
											<input 
												type="date"
												v-model="salesOrder.transaction_date"
												class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
												required
											>
										</div>

										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
											<input 
												type="date"
												v-model="salesOrder.delivery_date"
												class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
											>
										</div>

										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
											<select 
												v-model="salesOrder.currency"
												class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
											>
												<option value="SAR">SAR</option>
												<option value="USD">USD</option>
												<option value="EUR">EUR</option>
											</select>
										</div>

										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
											<select 
												v-model="salesOrder.priority"
												class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
											>
												<option value="Low">Low</option>
												<option value="Medium">Medium</option>
												<option value="High">High</option>
												<option value="Urgent">Urgent</option>
											</select>
										</div>
									</div>
								</div>

								<!-- Items Section -->
								<div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
									<div class="flex items-center justify-between mb-6">
										<div class="flex items-center">
											<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
												<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
												</svg>
											</div>
											<div>
												<h2 class="text-2xl font-semibold text-gray-800">Items</h2>
												<p class="text-sm text-gray-600">Add items to your sales order</p>
											</div>
										</div>
										<button 
											@click="addItem"
											class="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
										>
											<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
											</svg>
											Add Item
										</button>
									</div>

									<!-- Items Table -->
									<div class="overflow-x-auto">
										<table class="w-full">
											<thead>
												<tr class="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
													<th class="px-4 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Item</th>
													<th class="px-4 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
													<th class="px-4 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Rate</th>
													<th class="px-4 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
													<th class="px-4 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Warehouse</th>
													<th class="px-4 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">Action</th>
												</tr>
											</thead>
											<tbody class="bg-white divide-y divide-gray-200">
												<tr v-for="(item, index) in items" :key="index" class="hover:bg-gray-50 transition-colors duration-200">
													<td class="px-4 py-4">
														<select 
															v-model="item.item_code"
															@change="onItemChange(item)"
															class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
														>
															<option value="">Select Item</option>
															<option v-for="itemOption in itemsList" :key="itemOption.name" :value="itemOption.name">
																{{ itemOption.item_name }} ({{ itemOption.name }})
															</option>
														</select>
													</td>
													<td class="px-4 py-4">
														<input 
															type="number"
															v-model="item.qty"
															@input="calculateItemAmount(item)"
															min="1"
															step="1"
															class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
														>
													</td>
													<td class="px-4 py-4">
														<input 
															type="number"
															v-model="item.rate"
															@input="calculateItemAmount(item)"
															min="0"
															step="0.01"
															class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
														>
													</td>
													<td class="px-4 py-4">
														<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
															{{ (item.net_amount || 0).toLocaleString('en-US', { style: 'currency', currency: salesOrder.currency }) }}
														</span>
													</td>
													<td class="px-4 py-4">
														<select 
															v-model="item.warehouse"
															class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
														>
															<option value="">Select Warehouse</option>
															<option v-for="warehouse in warehouses" :key="warehouse.name" :value="warehouse.name">
																{{ warehouse.name }}
															</option>
														</select>
													</td>
													<td class="px-4 py-4 text-center">
														<button 
															@click="removeItem(index)"
															class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
															title="Remove Item"
														>
															<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
															</svg>
														</button>
													</td>
												</tr>
											</tbody>
										</table>
									</div>

									<!-- Totals Section -->
									<div class="mt-6 flex justify-end">
										<div class="bg-gradient-to-r from-green-50 to-yellow-50 rounded-xl p-6 border border-green-200">
											<div class="space-y-3">
												<div class="flex justify-between items-center">
													<span class="text-lg font-medium text-gray-700">Total Amount:</span>
													<span class="text-xl font-bold text-green-700">
														{{ (totalAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
													</span>
												</div>
												<div class="flex justify-between items-center">
													<span class="text-lg font-medium text-gray-700">VAT (15%):</span>
													<span class="text-xl font-bold text-blue-700">
														{{ (vatAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
													</span>
												</div>
												<div class="flex justify-between items-center border-t border-green-200 pt-3">
													<span class="text-xl font-semibold text-gray-800">Grand Total:</span>
													<span class="text-2xl font-bold text-green-600">
														{{ (grandTotal || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="flex justify-center space-x-4">
									<button 
										@click="resetForm"
										class="px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center font-semibold text-lg"
									>
										<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
										</svg>
										Reset Form
									</button>
									
									<!-- Send Email Button - Only show after successful Sales Order creation -->

									<button 
										v-if="lastCreatedSalesOrder"
										@click="sendEmail"
										:disabled="sendingEmail"
										class="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center font-semibold text-lg"
									>
										<svg v-if="!sendingEmail" class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
										</svg>
										<div v-else class="w-6 h-6 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										{{ sendingEmail ? 'Sending Email...' : 'Send Email' }}
									</button>
									
									<button 
										@click="saveSalesOrder"
										:disabled="saving"
										class="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center font-semibold text-lg"
									>
										<svg v-if="!saving" class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
										</svg>
										<div v-else class="w-6 h-6 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										{{ saving ? 'Creating Sales Order...' : 'Create Sales Order' }}
									</button>
								</div>
							</div>
						</div>
					</div>
				`
			});

			console.log('About to mount Vue app...');
			app.mount('#sales-order-app');
			console.log('Vue app mounted successfully');
		} catch (error) {
			console.error('Error creating Vue app:', error);
			console.error('Error stack:', error.stack);
			frappe.msgprint('Error initializing the page: ' + error.message);
		}
	};

	document.head.appendChild(vueScript);
	console.log('Vue script loaded');
});
