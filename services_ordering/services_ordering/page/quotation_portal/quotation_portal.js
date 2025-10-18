frappe.pages['quotation-portal'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Quotation Portal',
		single_column: true
	});

	// Add CSS and HTML content
	page.main.html(`
		<style>
			/* Loading animation styles */
			.loading-container {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0f4ff 100%);
				display: flex;
				justify-content: center;
				align-items: center;
				z-index: 9999;
				transition: opacity 0.5s ease-out;
			}
			
			.loading-spinner {
				width: 60px;
				height: 60px;
				border: 4px solid #e5e7eb;
				border-top: 4px solid #3b82f6;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}
			
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			
			.loading-text {
				margin-top: 20px;
				font-size: 18px;
				color: #6b7280;
				font-weight: 500;
			}
			
			/* Hide loading when page is ready */
			.page-loaded .loading-container {
				opacity: 0;
				pointer-events: none;
			}
			
			/* CSS override for full width */
			#quotation-app {
				width: 100% !important;
				min-height: 100vh !important;
			}
			
			/* Ensure full width for main container */
			.max-w-full {
				max-width: 100% !important;
				width: 100% !important;
			}
			
			/* Mobile Responsive Styles */
			@media (max-width: 768px) {
				/* Make padding smaller on mobile */
				.max-w-full {
					padding-left: 1rem !important;
					padding-right: 1rem !important;
				}
				
				/* Stack buttons vertically on mobile */
				.flex.space-x-4 {
					flex-direction: column;
					gap: 0.75rem;
				}
				
				.flex.space-x-4 > button {
					width: 100% !important;
				}
				
				/* Make dropdowns full width on mobile */
				.absolute.z-20, .absolute.z-30, .absolute.z-50 {
					position: fixed !important;
					left: 0 !important;
					right: 0 !important;
					top: 50% !important;
					transform: translateY(-50%) !important;
					width: 90% !important;
					max-width: 90vw !important;
					margin: 0 auto !important;
					max-height: 70vh !important;
				}
				
				/* Better modal on mobile */
				.fixed.inset-0 > div {
					max-width: 95vw !important;
					max-height: 95vh !important;
					margin: 0.5rem !important;
				}
				
				/* Adjust heading sizes for mobile */
				h1 {
					font-size: 1.875rem !important;
				}
				
				h2 {
					font-size: 1.5rem !important;
				}
				
				/* Make table responsive */
				.overflow-x-auto {
					-webkit-overflow-scrolling: touch;
				}
				
				/* Touch-friendly buttons and inputs */
				button, input, select {
					min-height: 44px !important;
				}
				
				/* Grid adjustments */
				.grid-cols-2, .grid-cols-3 {
					grid-template-columns: 1fr !important;
				}
			}
			
			/* Tablet styles */
			@media (min-width: 769px) and (max-width: 1024px) {
				.grid-cols-3 {
					grid-template-columns: repeat(2, 1fr) !important;
				}
			}
		</style>

		<!-- Loading Screen -->
		<div class="loading-container" id="loadingScreen">
			<div class="text-center">
				<div class="loading-spinner"></div>
				<div class="loading-text">Loading Quotation Form...</div>
			</div>
		</div>

		<!-- Main Content Container -->
		<div id="quotation-app"></div>
	`);

	// Load external dependencies
	frappe.require([
		'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
		'https://unpkg.com/vue@3/dist/vue.global.js'
	], function() {
		initializeQuotationApp();
	});

	function initializeQuotationApp() {
		// Hide loading screen
		setTimeout(function() {
			$('#loadingScreen').css('opacity', '0');
			$('body').addClass('page-loaded');
			setTimeout(function() {
				$('#loadingScreen').css('display', 'none');
			}, 500);
		}, 500);
		
		// Initialize Vue app
		if (typeof Vue !== 'undefined') {
			initializeVueApp();
		} else {
			setTimeout(function() {
				if (typeof Vue !== 'undefined') {
					initializeVueApp();
				} else {
					showError('Vue.js failed to load. Please refresh the page.');
				}
			}, 1000);
		}
	}
	
	function initializeVueApp() {
		try {
			const { createApp, ref, onMounted, computed } = Vue;

			const app = createApp({
				setup() {
					console.log('Vue setup function called');
					
					// Form data
					// Calculate default valid_till date (today + 15 days)
					const getDefaultValidTill = () => {
						const today = new Date();
						const validTill = new Date(today);
						validTill.setDate(today.getDate() + 15);
						return validTill.toISOString().split('T')[0];
					};

					const quotation = ref({
						customer: '',
						customer_name: '',
						transaction_date: new Date().toISOString().split('T')[0],
						valid_till: getDefaultValidTill(),
						payment_mode: '',
						currency: 'SAR',
						selling_price_list: 'البيع القياسية',
						company: '',
						priority: 'Medium',
						quotation_to: ''
					});

					const items = ref([]);
					const loading = ref(false);
					const saving = ref(false);
					const sendingEmail = ref(false);
					const lastCreatedQuotation = ref(null);
					const showSuccessMessage = ref(false);
					const successMessage = ref('');
					const isErrorMessage = ref(false);
					const customers = ref([]);
					const companies = ref([]);
					const itemsList = ref([]);
					const territories = ref([]);
					const customerGroups = ref([]);
					const priceLists = ref([]);
					const cleaningTeams = ref([]);
					const cities = ref([]);
					const neighborhoods = ref([]);
					
					// Dropdown states
					const showCustomerDropdown = ref(false);
					const showItemDropdown = ref({});
					const showTerritoryDropdown = ref(false);
					const showCityDropdown = ref(false);
					const showNeighborhoodDropdown = ref(false);
					const customerSearchTerm = ref('');
					const itemSearchTerm = ref({});
					const territorySearchTerm = ref('');
					const citySearchTerm = ref('');
					const neighborhoodSearchTerm = ref('');
					
					// Customer creation popup
					const showCreateCustomerPopup = ref(false);
					const creatingCustomer = ref(false);
					const newCustomer = ref({
						customer_name: '',
						customer_type: 'Individual',
						customer_group: 'Sage',
						territory: 'Saudi Arabia',
						mobile_no: '',
						email_id: '',
						address_line1: '',
						neighborhood: '',
						city: '',
						country: 'Saudi Arabia'
					});
					
					// Team availability viewer
					const showTeamAvailabilityPopup = ref(false);
					const loadingTeamAvailability = ref(false);
					const selectedTeamForViewing = ref('');
					const selectedDateForViewing = ref(new Date().toISOString().split('T')[0]);
					const teamAvailabilityData = ref(null);
					const availableTeamsList = ref([]);
					const showAllTeams = ref(false);
					const teamsToShowInitially = 2;
					const activeTeamTab = ref(0);

					// Add new item to the items list
					const addItem = () => {
						const newIndex = items.value.length;
						items.value.push({
							item_code: '',
							item_name: '',
							description: '',
							qty: 1,
							uom: 'Nos',
							rate: 0,
							amount: 0,
							net_amount: 0
						});
						// Initialize dropdown states for new item
						showItemDropdown.value[newIndex] = false;
						itemSearchTerm.value[newIndex] = '';
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
						
						item.amount = rate * qty;
						item.net_amount = item.amount;
						
						calculateTotals();
					};

					// Calculate totals
					const calculateTotals = () => {
						const total = items.value.reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0);
						return total;
					};

					// Computed properties
					const totalAmount = computed(() => calculateTotals());
					const vatAmount = computed(() => {
						const total = totalAmount.value || 0;
						const vat = total * 0.15;
						return vat;
					});
					const grandTotal = computed(() => {
						const grand = (totalAmount.value || 0) + (vatAmount.value || 0);
						return grand;
					});
					
					// Filtered customers for search
					const filteredCustomers = computed(() => {
						if (!customerSearchTerm.value) return customers.value;
						const searchTerm = customerSearchTerm.value.toLowerCase();
						return customers.value.filter(customer => {
							// Search by customer name
							const nameMatch = customer.customer_name && 
								customer.customer_name.toLowerCase().includes(searchTerm);
							
							// Search by customer ID
							const idMatch = customer.name && 
								customer.name.toLowerCase().includes(searchTerm);
							
							// Search by mobile number if it exists
							const mobileMatch = customer.mobile_no && 
								customer.mobile_no.toLowerCase().includes(searchTerm);
							
							return nameMatch || idMatch || mobileMatch;
						});
					});
					
					// Filtered territories for search
					const filteredTerritories = computed(() => {
						if (!territorySearchTerm.value) return territories.value;
						return territories.value.filter(territory => 
							territory.name.toLowerCase().includes(territorySearchTerm.value.toLowerCase()) ||
							(territory.territory_name && territory.territory_name.toLowerCase().includes(territorySearchTerm.value.toLowerCase()))
						);
					});
					
					// Filtered cities for search
					const filteredCities = computed(() => {
						if (!citySearchTerm.value) return cities.value;
						return cities.value.filter(city => 
							(city.city && city.city.toLowerCase().includes(citySearchTerm.value.toLowerCase()))
						);
					});
					
					// Filtered neighborhoods for search (filtered by city and search term)
					const filteredNeighborhoods = computed(() => {
						// First filter by selected city
						let filtered = neighborhoods.value;
						
						if (newCustomer.value.city) {
							filtered = filtered.filter(neighborhood => 
								neighborhood.city === newCustomer.value.city
							);
						}
						
						// Then filter by search term
						if (neighborhoodSearchTerm.value) {
							filtered = filtered.filter(neighborhood => 
								neighborhood.name && neighborhood.name.toLowerCase().includes(neighborhoodSearchTerm.value.toLowerCase())
							);
						}
						
						return filtered;
					});
					
					// Toggle customer dropdown
					const toggleCustomerDropdown = () => {
						showCustomerDropdown.value = !showCustomerDropdown.value;
					};
					
					// Select customer
					const selectCustomer = async (customer) => {
						quotation.value.customer = customer.name;
						showCustomerDropdown.value = false;
						customerSearchTerm.value = '';
						await onCustomerChange();
					};
					
					// Toggle item dropdown
					const toggleItemDropdown = (index) => {
						showItemDropdown.value[index] = !showItemDropdown.value[index];
					};
					
					// Get filtered items for specific row
					const getFilteredItems = (index) => {
						const searchTerm = itemSearchTerm.value[index] || '';
						if (!searchTerm) return itemsList.value;
						return itemsList.value.filter(item => 
							item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							item.name.toLowerCase().includes(searchTerm.toLowerCase())
						);
					};
					
					// Select item
					const selectItem = async (item, index) => {
						items.value[index].item_code = item.name;
						showItemDropdown.value[index] = false;
						itemSearchTerm.value[index] = '';
						await onItemChange(items.value[index]);
					};
					
					// Toggle territory dropdown
					const toggleTerritoryDropdown = () => {
						showTerritoryDropdown.value = !showTerritoryDropdown.value;
					};
					
					// Select territory
					const selectTerritory = (territory) => {
						newCustomer.value.territory = territory.name;
						showTerritoryDropdown.value = false;
						territorySearchTerm.value = '';
					};
					
					// Toggle city dropdown
					const toggleCityDropdown = () => {
						showCityDropdown.value = !showCityDropdown.value;
					};
					
					// Select city
					const selectCity = (city, event) => {
						if (event) {
							event.stopPropagation();
							event.preventDefault();
						}
						
						// Clear neighborhood if city changes
						if (newCustomer.value.city !== city.city) {
							newCustomer.value.neighborhood = '';
						}
						
						newCustomer.value.city = city.city;
						showCityDropdown.value = false;
						citySearchTerm.value = '';
					};
					
					// Toggle neighborhood dropdown
					const toggleNeighborhoodDropdown = () => {
						showNeighborhoodDropdown.value = !showNeighborhoodDropdown.value;
					};
					
					// Select neighborhood
					const selectNeighborhood = (neighborhood, event) => {
						if (event) {
							event.stopPropagation();
							event.preventDefault();
						}
						newCustomer.value.neighborhood = neighborhood.name;
						showNeighborhoodDropdown.value = false;
						neighborhoodSearchTerm.value = '';
					};
					
					// Mobile number validation
					const validateMobileNumber = (mobileNumber) => {
						const saudiMobileRegex = /^\+9665\d{8}$/;
						return saudiMobileRegex.test(mobileNumber);
					};
					
					const formatMobileNumber = (event) => {
						let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
						
						// If it starts with 05, convert to +9665
						if (value.startsWith('05')) {
							value = '9665' + value.substring(2);
						}
						// If it starts with 5, add 966
						else if (value.startsWith('5') && !value.startsWith('966')) {
							value = '9665' + value.substring(1);
						}
						// If it doesn't start with 966, add it
						else if (!value.startsWith('966')) {
							if (value.length > 0) {
								value = '9665' + value;
							}
						}
						
						// Add + prefix
						if (value.length > 0 && !value.startsWith('+')) {
							value = '+' + value;
						}
						
						// Limit to correct length (+9665xxxxxxxx = 13 characters)
						if (value.length > 13) {
							value = value.substring(0, 13);
						}
						
						event.target.value = value;
						newCustomer.value.mobile_no = value;
					};
					
					// Helper function to show messages
					const showMessage = (message, isError = false) => {
						successMessage.value = message;
						isErrorMessage.value = isError;
						showSuccessMessage.value = true;
						setTimeout(() => { showSuccessMessage.value = false; }, 5000);
					};

					// Customer creation functions
					const openCreateCustomerPopup = () => {
						showCreateCustomerPopup.value = true;
						showCustomerDropdown.value = false;
					};
					
					const closeCreateCustomerPopup = () => {
						showCreateCustomerPopup.value = false;
						resetNewCustomerForm();
					};
					
					const resetNewCustomerForm = () => {
						newCustomer.value = {
							customer_name: '',
							customer_type: 'Individual',
							customer_group: 'Sage',
							territory: 'Saudi Arabia',
							mobile_no: '',
							email_id: '',
							address_line1: '',
							neighborhood: '',
							city: '',
							country: 'Saudi Arabia'
						};
					};
					
					const createNewCustomer = async () => {
						try {
							creatingCustomer.value = true;
							
							if (!newCustomer.value.customer_name) {
								showMessage('Customer name is required', true);
								creatingCustomer.value = false;
								return;
							}
							
							// Validate mobile number if provided
							if (newCustomer.value.mobile_no && !validateMobileNumber(newCustomer.value.mobile_no)) {
								showMessage('Mobile number must be in format +9665xxxxxxxx', true);
								creatingCustomer.value = false;
								return;
							}
							
							console.log('Creating new customer:', newCustomer.value);
							
							const response = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.create_customer",
								args: {
									customer_data: newCustomer.value
								}
							});
							
							if (response && response.message && response.message.success) {
								const customerData = response.message.data;
								
								// Add the new customer to the customers list
								customers.value.push({
									name: customerData.name,
									customer_name: customerData.customer_name,
									customer_group: customerData.customer_group,
									territory: customerData.territory,
									mobile_no: newCustomer.value.mobile_no,
									email_id: newCustomer.value.email_id
								});
								
								// Set the newly created customer as selected
								quotation.value.customer = customerData.name;
								quotation.value.customer_name = customerData.customer_name;
								
								// Show success message
								showMessage(`Customer "${customerData.customer_name}" created successfully!`, false);
								
								// Close the popup
								closeCreateCustomerPopup();
								
								// Trigger customer change to load customer details
								await onCustomerChange();
							} else {
								showMessage('Error creating customer: ' + (response?.message?.message || 'Unknown error'), true);
							}
							
						} catch (error) {
							console.error('Error creating customer:', error);
							showMessage('Error creating customer: ' + error.message, true);
						} finally {
							creatingCustomer.value = false;
						}
					};
					
					const downloadQuotationPDF = async () => {
						try {
							downloadingPDF.value = true;
							
							if (!lastCreatedQuotation.value) {
								showMessage('No Quotation to download', true);
								return;
							}
							
							console.log('Downloading PDF for:', lastCreatedQuotation.value.quotation_name);
							
							const response = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.download_quotation_pdf",
								args: {
									quotation_name: lastCreatedQuotation.value.quotation_name
								}
							});
							
							if (response && response.message && response.message.success) {
								// Convert base64 to blob and download
								const byteCharacters = atob(response.message.pdf_content);
								const byteNumbers = new Array(byteCharacters.length);
								for (let i = 0; i < byteCharacters.length; i++) {
									byteNumbers[i] = byteCharacters.charCodeAt(i);
								}
								const byteArray = new Uint8Array(byteNumbers);
								const blob = new Blob([byteArray], { type: 'application/pdf' });
								
								// Create download link
								const url = window.URL.createObjectURL(blob);
								const link = document.createElement('a');
								link.href = url;
								link.download = response.message.filename;
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
								window.URL.revokeObjectURL(url);
								
								showMessage('PDF downloaded successfully!', false);
							} else {
								showMessage('Error downloading PDF: ' + (response?.message?.message || 'Unknown error'), true);
							}
							
						} catch (error) {
							console.error('Error downloading PDF:', error);
							showMessage('Error downloading PDF: ' + error.message, true);
						} finally {
							downloadingPDF.value = false;
						}
					};
					
					// Team availability viewer functions
					const openTeamAvailabilityPopup = async () => {
						showTeamAvailabilityPopup.value = true;
						// Fetch teams list and availability for all teams
						try {
							const response = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.get_cleaning_teams_list"
							});
							if (response && response.message && response.message.success) {
								availableTeamsList.value = response.message.data || [];
								
								// Fetch availability for all teams
								await fetchAllTeamsAvailability();
							}
						} catch (error) {
							console.error('Error fetching teams:', error);
						}
					};
					
					const closeTeamAvailabilityPopup = () => {
						showTeamAvailabilityPopup.value = false;
						selectedTeamForViewing.value = '';
						teamAvailabilityData.value = null;
						showAllTeams.value = false;
						activeTeamTab.value = 0;
					};
					
					// Fetch availability for all teams
					const fetchAllTeamsAvailability = async () => {
						if (!availableTeamsList.value || availableTeamsList.value.length === 0) {
							return;
						}
						
						try {
							loadingTeamAvailability.value = true;
							const allTeamsData = [];
							
							// Fetch availability for each team
							for (const team of availableTeamsList.value) {
								try {
									const response = await frappe.call({
										method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.get_team_availability",
										args: {
											team_name: team.name,
											date: selectedDateForViewing.value
										}
									});
									
									if (response && response.message && response.message.success) {
										allTeamsData.push({
											team_name: team.name,
											team_display_name: team.name1 || team.name,
											...response.message.data
										});
									}
								} catch (error) {
									console.error(`Error fetching availability for team ${team.name}:`, error);
									// Add team with error state
									allTeamsData.push({
										team_name: team.name,
										team_display_name: team.name1 || team.name,
										error: true,
										shifts: [],
										appointments: []
									});
								}
							}
							
							teamAvailabilityData.value = allTeamsData;
						} catch (error) {
							console.error('Error fetching all teams availability:', error);
							showMessage('Error loading team availability: ' + error.message, true);
						} finally {
							loadingTeamAvailability.value = false;
						}
					};
					
					// Handle team selection change
					const onTeamSelectionChange = () => {
						if (selectedTeamForViewing.value) {
							// Reset tab to first team when switching to single team view
							activeTeamTab.value = 0;
							fetchTeamAvailability();
						} else {
							// Reset to all teams view and fetch all teams data
							activeTeamTab.value = 0;
							fetchAllTeamsAvailability();
						}
					};
					
					const fetchTeamAvailability = async () => {
						if (!selectedTeamForViewing.value) {
							showMessage('Please select a team', true);
							return;
						}
						
						try {
							loadingTeamAvailability.value = true;
							const response = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.get_team_availability",
								args: {
									team_name: selectedTeamForViewing.value,
									date: selectedDateForViewing.value
								}
							});
							
							if (response && response.message && response.message.success) {
								teamAvailabilityData.value = response.message.data;
							} else {
								showMessage('Error loading team availability', true);
							}
						} catch (error) {
							console.error('Error fetching team availability:', error);
							showMessage('Error loading team availability: ' + error.message, true);
						} finally {
							loadingTeamAvailability.value = false;
						}
					};
					
					// Helper function to check if a time slot is booked for a specific team
					const isTimeSlotBooked = (hour, teamData) => {
						if (!teamData || !teamData.appointments) return false;
						
						return teamData.appointments.some(appointment => {
							try {
								const startDate = new Date(appointment.appointment_date_time);
								const startHour = startDate.getHours();
								const duration = appointment.total_service_time || 1;
								const endHour = startHour + duration;
								
								return hour >= startHour && hour < endHour;
							} catch (e) {
								return false;
							}
						});
					};
					
					// Helper function to check if hour is in working shift for a specific team
					const isInWorkingShift = (hour, teamData) => {
						if (!teamData || !teamData.shifts) return false;
						
						return teamData.shifts.some(shift => {
							const startHour = parseInt(shift.start_time.split(':')[0]);
							const endHour = parseInt(shift.end_time.split(':')[0]);
							return hour >= startHour && hour < endHour;
						});
					};
					
					// Helper function to get time slots for display
					const getTimeSlots = () => {
						const slots = [];
						for (let hour = 0; hour < 24; hour++) {
							slots.push(hour);
						}
						return slots;
					};
					
					// Helper function to format hour for display
					const formatHour = (hour) => {
						return `${hour.toString().padStart(2, '0')}:00`;
					};
					
					// Navigate back to Sage Sales
					const goBackToSageSales = () => {
						window.location.href = '/app/sage-sales';
					};

					// Test backend connection with retry and enhanced error handling
					const testBackendConnection = async () => {
						try {
							console.log('Testing backend connection...');
							console.log('Calling method: services_ordering.services_ordering.page.quotation_portal.quotation_portal.test_connection');
							
							const testResponse = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.test_connection"
							});
							
							console.log('Backend test response:', testResponse);
							
							// Check different possible response structures
							if (testResponse && testResponse.message) {
								if (typeof testResponse.message === 'object' && testResponse.message.success) {
									return true;
								} else if (typeof testResponse.message === 'string') {
									// Sometimes Frappe returns the result as a JSON string
									try {
										const parsed = JSON.parse(testResponse.message);
										return parsed && parsed.success;
									} catch (e) {
										console.log('Message is not JSON:', testResponse.message);
										return false;
									}
								}
							}
							
							return false;
						} catch (error) {
							console.error('Backend connection test failed:', error);
							return false;
						}
					};

					// Fetch master data from backend
					const fetchMasterData = async () => {
						try {
							loading.value = true;
							console.log('Fetching master data from backend...');
							
							// Test backend connection first
							console.log('Testing backend connection...');
							const connectionTest = await testBackendConnection();
							if (!connectionTest) {
								throw new Error('Backend connection test failed');
							}
							
							const response = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.get_master_data",
								callback: function(r) {
									console.log('Frappe call response:', r);
								}
							});

							console.log('Raw response:', response);

							if (response && response.message && response.message.success) {
								const data = response.message.data;
								customers.value = data.customers || [];
								companies.value = data.companies || [];
								itemsList.value = data.items || [];
								territories.value = data.territories || [];
								customerGroups.value = data.customer_groups || [];
								priceLists.value = data.price_lists || [];
								cleaningTeams.value = data.cleaning_teams || [];
								cities.value = data.cities || [];
								neighborhoods.value = data.neighborhoods || [];
								
								console.log('Master data loaded successfully:', {
									customers: customers.value.length,
									companies: companies.value.length,
									items: itemsList.value.length,
									neighborhoods: neighborhoods.value.length
								});
							} else {
								console.error('Failed to fetch master data:', response);
								successMessage.value = 'Failed to load master data: ' + (response?.message?.message || 'Unknown error');
								isErrorMessage.value = true;
								showSuccessMessage.value = true;
								setTimeout(() => { showSuccessMessage.value = false; }, 5000);
							}
						} catch (error) {
							console.error('Error fetching master data:', error);
							successMessage.value = 'Error loading data: ' + error.message;
							isErrorMessage.value = true;
							showSuccessMessage.value = true;
							setTimeout(() => { showSuccessMessage.value = false; }, 5000);
						} finally {
							loading.value = false;
						}
					};

					// Save Sales Order
					const saveQuotation = async () => {
						try {
							saving.value = true;
							
							if (!quotation.value.customer) {
								showMessage('Please select a customer', true);
								return;
							}
							
							if (items.value.length === 0) {
								showMessage('Please add at least one service', true);
								return;
							}

							// Prepare quotation data
							const quotationData = {
								...quotation.value,
								items: items.value,
								custom_payment_mode: quotation.value.payment_mode
							};

							console.log('Creating quotation:', quotationData);

							const response = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.create_quotation",
								args: {
									quotation_data: quotationData
								}
							});

							if (response.message && response.message.success) {
								lastCreatedQuotation.value = response.message;
								
								// Show custom success message
								let successDetails = `Sales Order ${response.message.quotation_name} created successfully!`;
								if (response.message.data?.custom_time) {
									// Format time in 24-hour format
									successDetails += ` Time: ${response.message.data.custom_time}`;
								}
								if (response.message.data?.custom_team) {
									const teamName = cleaningTeams.value.find(t => t.name === response.message.data.custom_team)?.name1 || response.message.data.custom_team;
									successDetails += ` Team: ${teamName}`;
								}
								successMessage.value = successDetails;
								isErrorMessage.value = false;
								showSuccessMessage.value = true;
								
								// Auto-hide success message after 5 seconds
								setTimeout(() => {
									showSuccessMessage.value = false;
								}, 5000);
								
								// Don't reset form - let user decide when to reset
							} else {
								// Show custom error message
								successMessage.value = 'Error Creating quotation: ' + (response.message?.message || 'Unknown error');
								isErrorMessage.value = true;
								showSuccessMessage.value = true;
								
								// Auto-hide error message after 5 seconds
								setTimeout(() => {
									showSuccessMessage.value = false;
								}, 5000);
							}

						} catch (error) {
							console.error('Error saving sales order:', error);
							
							// Show custom error message
							successMessage.value = 'Error Creating quotation: ' + error.message;
							isErrorMessage.value = true;
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
						if (!confirm('Are you sure you want to reset the form? All unsaved data will be lost.')) {
							return; // If user clicks Cancel, do nothing
						}
						
						quotation.value = {
							customer: '',
							customer_name: '',
							transaction_date: new Date().toISOString().split('T')[0],
							valid_till: getDefaultValidTill(),
							payment_mode: '',
							currency: 'SAR',
							selling_price_list: 'البيع القياسية',
							company: '',
							priority: 'Medium',
							quotation_to: ''
						};
						items.value = [];
						lastCreatedQuotation.value = null;
						showSuccessMessage.value = false;
					};

					// Send Email with PDF
					const sendEmail = async () => {
						try {
							sendingEmail.value = true;
							
							if (!lastCreatedQuotation.value) {
								successMessage.value = 'No Quotation to send. Please create a quotation first.';
								showSuccessMessage.value = true;
								setTimeout(() => { showSuccessMessage.value = false; }, 5000);
								return;
							}

							if (!quotation.value.customer) {
								successMessage.value = 'Customer information is missing.';
								showSuccessMessage.value = true;
								setTimeout(() => { showSuccessMessage.value = false; }, 5000);
								return;
							}

							// Send email with PDF attachment using our improved method
							const emailResponse = await frappe.call({
								method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.send_quotation_email",
								args: {
									quotation_name: lastCreatedQuotation.value.quotation_name,
									customer_name: quotation.value.customer
								}
							});

							if (emailResponse.message && emailResponse.message.success) {
								successMessage.value = emailResponse.message.message;
								showSuccessMessage.value = true;
								setTimeout(() => { showSuccessMessage.value = false; }, 5000);
							} else {
								successMessage.value = 'Error sending email: ' + (emailResponse.message?.message || 'Unknown error');
								showSuccessMessage.value = true;
								setTimeout(() => { showSuccessMessage.value = false; }, 5000);
							}

						} catch (error) {
							console.error('Error sending email:', error);
							successMessage.value = 'Error sending email: ' + error.message;
							showSuccessMessage.value = true;
							setTimeout(() => { showSuccessMessage.value = false; }, 5000);
						} finally {
							sendingEmail.value = false;
						}
					};

					// Handle customer selection
					const onCustomerChange = async () => {
						const selectedCustomer = customers.value.find(c => c.name === quotation.value.customer);
						if (selectedCustomer) {
							quotation.value.customer_name = selectedCustomer.customer_name;
							quotation.value.customer_group = selectedCustomer.customer_group;
							quotation.value.territory = selectedCustomer.territory;
							
							// Fetch detailed customer info from backend
							try {
								const response = await frappe.call({
									method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.get_customer_details",
									args: {
										customer: quotation.value.customer
									}
								});
								
								if (response.message && response.message.success) {
									const customerDetails = response.message.data;
									quotation.value.currency = customerDetails.default_currency || quotation.value.currency;
									quotation.value.selling_price_list = customerDetails.default_price_list || quotation.value.selling_price_list;
									quotation.value.payment_terms_template = customerDetails.payment_terms;
									
									// Set address and contact if available
									if (customerDetails.default_address) {
										quotation.value.customer_address = customerDetails.default_address.name;
									}
									if (customerDetails.default_contact) {
										quotation.value.contact_person = customerDetails.default_contact.name;
										quotation.value.contact_display = `${customerDetails.default_contact.first_name} ${customerDetails.default_contact.last_name}`;
										quotation.value.contact_mobile = customerDetails.default_contact.mobile_no;
										quotation.value.contact_email = customerDetails.default_contact.email_id;
									}
								}
							} catch (error) {
								console.error('Error fetching customer details:', error);
							}
						}
					};

					// Handle item selection
					const onItemChange = async (item) => {
						const selectedItem = itemsList.value.find(i => i.name === item.item_code);
						if (selectedItem) {
							item.item_name = selectedItem.item_name;
							item.description = selectedItem.description;
							item.uom = selectedItem.stock_uom;
							item.rate = selectedItem.standard_rate || 0;
							calculateItemAmount(item);
							
							// Optionally fetch detailed item info from backend
							try {
								const response = await frappe.call({
									method: "services_ordering.services_ordering.page.quotation_portal.quotation_portal.get_item_details",
									args: {
										item_code: item.item_code,
										customer: quotation.value.customer,
										company: quotation.value.company,
										price_list: quotation.value.selling_price_list
									}
								});
								
								if (response.message && response.message.success) {
									const itemDetails = response.message.data;
									item.rate = itemDetails.rate || item.rate;
									item.item_tax_template = itemDetails.item_tax_template;
									calculateItemAmount(item);
								}
							} catch (error) {
								console.error('Error fetching item details:', error);
							}
						}
					};

					onMounted(() => {
						console.log('Vue onMounted called');
						fetchMasterData();
						addItem(); // Add first item by default
						
						// Add beforeunload event to show confirmation before page refresh
						window.addEventListener('beforeunload', (event) => {
							// Check if there's any data in the form that would be lost
							if (quotation.value.customer || items.value.length > 1 || 
								items.value[0]?.item_code || quotation.value.time || quotation.value.team) {
								// Cancel the event
								event.preventDefault();
								// Chrome requires returnValue to be set
								event.returnValue = 'Are you sure you want to leave? Your unsaved changes will be lost.';
								return event.returnValue;
							}
						}); 
					});

					return {
						quotation,
						items,
						loading,
						saving,
						sendingEmail,
						lastCreatedQuotation,
						showSuccessMessage,
						successMessage,
						isErrorMessage,
						customers,
						companies,
						territories,
						customerGroups,
						itemsList,
						cleaningTeams,
						cities,
						neighborhoods,
						totalAmount,
						vatAmount,
						grandTotal,
						addItem,
						removeItem,
						calculateItemAmount,
						saveQuotation,
						resetForm,
						sendEmail,
						onCustomerChange,
						onItemChange,
						showMessage,
						// Dropdowns and search
						showCustomerDropdown,
						showItemDropdown,
						showTerritoryDropdown,
						showCityDropdown,
						showNeighborhoodDropdown,
						customerSearchTerm,
						itemSearchTerm,
						territorySearchTerm,
						citySearchTerm,
						neighborhoodSearchTerm,
						filteredCustomers,
						filteredTerritories,
						filteredCities,
						filteredNeighborhoods,
						toggleCustomerDropdown,
						selectCustomer,
						toggleItemDropdown,
						getFilteredItems,
						selectItem,
						toggleTerritoryDropdown,
						selectTerritory,
						toggleCityDropdown,
						selectCity,
						toggleNeighborhoodDropdown,
						selectNeighborhood,
						// Customer creation modal
						showCreateCustomerPopup,
						creatingCustomer,
						newCustomer,
						openCreateCustomerPopup,
						closeCreateCustomerPopup,
						createNewCustomer,
						// Mobile number validation
						validateMobileNumber,
						formatMobileNumber,
						downloadQuotationPDF,
						// Team availability viewer
						showTeamAvailabilityPopup,
						loadingTeamAvailability,
						selectedTeamForViewing,
						selectedDateForViewing,
						teamAvailabilityData,
						availableTeamsList,
						showAllTeams,
						teamsToShowInitially,
						activeTeamTab,
						openTeamAvailabilityPopup,
						closeTeamAvailabilityPopup,
						onTeamSelectionChange,
						fetchTeamAvailability,
						fetchAllTeamsAvailability,
						isTimeSlotBooked,
						isInWorkingShift,
						getTimeSlots,
						formatHour,
						// Navigation
						goBackToSageSales
					};
				},

template: `
<div class="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
<!-- Success/Error Message Popup -->
<div v-if="showSuccessMessage" class="fixed top-20 right-4 left-4 sm:left-auto z-[9999] max-w-md mx-auto sm:mx-0" style="max-width: 90vw; word-wrap: break-word;">
<div :class="isErrorMessage ? 'bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 flex items-center' : 'bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 flex items-center'" style="min-width: 280px;">
<div class="flex-shrink-0">
<!-- Success Icon -->
<svg v-if="!isErrorMessage" class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
</svg>
<!-- Error Icon -->
<svg v-else class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
</svg>
</div>
<div class="ml-3 flex-1">
<p class="text-sm font-medium text-gray-900 break-words">{{ successMessage }}</p>
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
							<div class="max-w-full mx-auto px-2 sm:px-4">
<!-- Back Button -->
<div class="mb-4 sm:mb-6">
<button 
@click="goBackToSageSales"
class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
title="Back to Sage Sales"
>
<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
</svg>
Back to Sage Sales
</button>
</div>

<!-- Main Form -->
<div class="space-y-4 sm:space-y-6 md:space-y-8">
<!-- Customer Information Card -->
<div class="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 p-4 sm:p-6">
<div class="flex items-center mb-4 sm:mb-6">
<div class="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
</div>
<div>
<h2 class="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">Customer Information</h2>
<p class="text-xs sm:text-sm text-gray-600">Select customer and basic order details</p>
</div>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
<div class="relative">
<!-- Enhanced Customer Dropdown -->
<div 
@click="toggleCustomerDropdown"
class="border-2 border-gray-200 rounded-xl p-4 bg-white cursor-pointer hover:border-green-400 hover:shadow-md transition-all duration-200 flex justify-between items-center"
>
<div class="flex items-center">
<div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
</div>
<span class="text-gray-700 font-medium">
{{ quotation.customer ? (customers.find(c => c.name === quotation.customer)?.customer_name || quotation.customer) : 'Select customer...' }}
</span>
</div>
<svg class="w-6 h-6 text-gray-400 transition-transform duration-200" :class="showCustomerDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
</svg>
</div>

<!-- Enhanced Dropdown Options -->
<div v-if="showCustomerDropdown" class="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
<div class="p-4">
<!-- Enhanced Search Box -->
<div class="relative mb-4">
<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
</svg>
<input 
v-model="customerSearchTerm"
type="text"
placeholder="Search by name, ID or mobile number..."
class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-200"
>
</div>

<!-- Enhanced Options List -->
<div class="space-y-2">
<div 
v-for="customer in filteredCustomers" 
:key="customer.name"
@click="selectCustomer(customer)"
class="flex items-center p-3 hover:bg-green-50 rounded-lg cursor-pointer transition-colors duration-200 border border-transparent hover:border-green-200"
>
<div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
</div>
<div class="flex-1">
<div class="font-semibold text-gray-900 text-base">{{ customer.customer_name }}</div>
<div class="text-sm text-gray-600 mt-1">
<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
🏢 {{ customer.name }}
</span>
<span v-if="customer.mobile_no" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
📱 {{ customer.mobile_no }}
</span>
<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
📍 {{ customer.territory || 'N/A' }}
</span>
</div>
</div>
</div>
</div>

<!-- Enhanced No Results Message -->
<div v-if="filteredCustomers.length === 0" class="text-center py-8 text-gray-500">
<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
<p class="text-lg font-medium">No customers found</p>
<p class="text-sm">Try adjusting your search terms</p>
</div>

<!-- Create New Customer Button -->
<div class="border-t border-gray-200 pt-4 mt-4">
<button 
@click="openCreateCustomerPopup"
class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center font-medium"
>
<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
</svg>
Create New Customer
</button>
</div>
</div>
</div>
</div>
</div>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Valid Till</label>
<input 
type="date"
v-model="quotation.valid_till"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
>
</div>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
<select
v-model="quotation.payment_mode"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
>
<option value="">Select payment mode...</option>
<option value="POS">POS</option>
<option value="Bank">Bank</option>
</select>
</div>

<!-- Time dropdown temporarily disabled
<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Time</label>
<div class="relative">
<div 
class="border-2 border-gray-200 rounded-xl p-4 bg-gray-100 text-gray-500 flex items-center"
>
<div class="flex items-center">
<div class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
</svg>
</div>
<span class="text-gray-500 font-medium">
Time feature temporarily disabled
</span>
</div>
</div>
</div>
</div>
-->

<!-- Team dropdown temporarily disabled
<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Team</label>
<div class="relative">
<div class="border-2 border-gray-200 rounded-xl p-4 bg-gray-100 text-gray-500 flex items-center">
<div class="flex items-center">
<div class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
</svg>
</div>
<span class="text-gray-500 font-medium">
Team feature temporarily disabled
</span>
</div>
</div>
</div>
</div>
-->
</div>
</div>

<!-- Services Section -->
<div class="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 p-4 sm:p-6" style="overflow: visible; position: relative; z-index: 10;">
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
<div class="flex items-center">
<div class="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
</svg>
</div>
<div>
<h2 class="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">Services</h2>
<p class="text-xs sm:text-sm text-gray-600">Add services to your order</p>
</div>
</div>
<button 
@click="addItem"
class="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center text-sm sm:text-base font-medium"
>
<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
</svg>
Add Service
</button>
</div>


<!-- Services List - All Screens -->
<div class="space-y-4">
<div v-for="(item, index) in items" :key="index" class="bg-white rounded-lg p-4 border border-gray-200 relative shadow-sm">
<!-- Remove Button - Top Right -->
<button 
@click="removeItem(index)"
class="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 p-2 rounded-lg shadow transition-all duration-200"
title="Remove Service"
>
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
</svg>
</button>

<!-- Service Selection -->
<div class="mb-3 pr-10">
<label class="block text-xs font-medium text-gray-600 mb-2">Service</label>
<div class="relative">
<div 
@click="toggleItemDropdown(index)"
class="border border-gray-300 rounded-lg p-3 bg-white cursor-pointer hover:border-green-500 transition-all duration-200 flex justify-between items-center"
>
<div class="flex items-center flex-1 min-w-0">
<div class="w-6 h-6 bg-green-100 rounded flex items-center justify-center mr-2 flex-shrink-0">
<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
</svg>
</div>
<span class="text-gray-700 font-medium text-sm truncate">
{{ item.item_code ? (itemsList.find(i => i.name === item.item_code)?.item_name || item.item_code) : 'Select service...' }}
</span>
</div>
<svg class="w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2" :class="showItemDropdown[index] ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
</svg>
</div>

<!-- Service Dropdown -->
<div v-if="showItemDropdown[index]" class="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
<div class="p-4">
<div class="relative mb-4">
<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
</svg>
<input 
v-model="itemSearchTerm[index]"
type="text"
placeholder="Search services..."
class="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
>
</div>
<div class="space-y-2 max-h-60 overflow-y-auto">
<div 
v-for="itemOption in getFilteredItems(index)" 
:key="itemOption.name"
@click="selectItem(itemOption, index)"
class="flex items-center p-3 hover:bg-green-50 rounded-lg cursor-pointer transition-colors duration-200 border border-transparent hover:border-green-200"
>
<div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
</svg>
</div>
<div class="flex-1 min-w-0">
<div class="font-semibold text-gray-900 text-sm truncate">{{ itemOption.item_name }}</div>
<div class="text-xs text-gray-600 mt-1">
<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
{{ itemOption.name }}
</span>
<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
{{ (itemOption.standard_rate || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
</span>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>

<!-- Quantity and Rate - Side by Side -->
<div class="grid grid-cols-2 gap-3 mb-3">
<div>
<label class="block text-xs font-medium text-gray-600 mb-2">Quantity</label>
<input 
type="number"
v-model="item.qty"
@input="calculateItemAmount(item)"
min="1"
step="1"
class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
placeholder="Qty"
>
</div>
<div>
<label class="block text-xs font-medium text-gray-600 mb-2">Rate (SAR)</label>
<input 
type="number"
v-model="item.rate"
@input="calculateItemAmount(item)"
min="0"
step="0.01"
class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
placeholder="Rate"
>
</div>
</div>

<!-- Amount Display -->
<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
<div class="flex justify-between items-center">
<span class="text-sm font-medium text-gray-600">Amount:</span>
<span class="text-lg font-semibold text-green-600">
{{ (item.net_amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
</span>
</div>
</div>
</div>
</div>

<!-- Totals Section -->
<div class="mt-4 sm:mt-6 flex justify-end">
<div class="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 w-full sm:w-auto shadow-sm">
<div class="space-y-2 sm:space-y-3">
<div class="flex justify-between items-center gap-4">
<span class="text-sm sm:text-base font-medium text-gray-600">Total Amount:</span>
<span class="text-base sm:text-lg font-semibold text-gray-800">
{{ (totalAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
</span>
</div>
<div class="flex justify-between items-center gap-4">
<span class="text-sm sm:text-base font-medium text-gray-600">VAT (15%):</span>
<span class="text-base sm:text-lg font-semibold text-gray-800">
{{ (vatAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
</span>
</div>
<div class="flex justify-between items-center gap-4 border-t border-gray-200 pt-2 sm:pt-3">
<span class="text-base sm:text-lg font-semibold text-gray-800">Grand Total:</span>
<span class="text-lg sm:text-2xl font-bold text-green-600">
{{ (grandTotal || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) }}
</span>
</div>
</div>
</div>
</div>
</div>

<!-- Action Buttons -->
<div class="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
<div class="flex flex-col sm:flex-row justify-center gap-3">
<button 
@click="resetForm"
class="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center font-medium text-base"
>
<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
</svg>
Reset Form
</button>

<!-- Download PDF Button - Only show after successful Sales Order creation -->
<button 
v-if="lastCreatedQuotation"
@click="downloadQuotationPDF"
:disabled="downloadingPDF"
class="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium text-base"
>
<svg v-if="!downloadingPDF" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
</svg>
<div v-else class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
{{ downloadingPDF ? 'Downloading...' : 'Download PDF' }}
</button>

<!-- Send Email Button - Only show after successful Sales Order creation -->
<button 
v-if="lastCreatedQuotation"
@click="sendEmail"
:disabled="sendingEmail"
class="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium text-base"
>
<svg v-if="!sendingEmail" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z"></path>
</svg>
<div v-else class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
{{ sendingEmail ? 'Sending Email...' : 'Send Email' }}
</button>

<button 
@click="saveQuotation"
:disabled="saving"
class="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-base shadow-md hover:shadow-lg"
>
<svg v-if="!saving" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>
<div v-else class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
{{ saving ? 'Creating Order...' : 'Create Quotation' }}
</button>
</div>
</div>
</div>
</div>
</div>

<!-- Create Customer Popup Modal -->
<div v-if="showCreateCustomerPopup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
<div class="p-4 sm:p-6">
<!-- Modal Header -->
<div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
<div class="flex items-center">
<div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>
</div>
<h2 class="text-xl sm:text-2xl font-semibold text-gray-800">Create New Customer</h2>
</div>
<button @click="closeCreateCustomerPopup" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
</svg>
</button>
</div>

<!-- Customer Form -->
<div class="space-y-6">
<!-- Basic Information -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
<input 
v-model="newCustomer.customer_name"
type="text"
placeholder="Enter customer name"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
required
>
</div>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
<select 
v-model="newCustomer.customer_type"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
>
<option value="Individual">Individual</option>
<option value="Company">Company</option>
</select>
</div>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Customer Group</label>
<input 
type="text"
v-model="newCustomer.customer_group"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed"
readonly
>
</div>

</div>

<!-- Contact Information -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
<div class="relative">
<input 
v-model="newCustomer.mobile_no"
@input="formatMobileNumber"
type="tel"
placeholder="+9665xxxxxxxx"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
:class="newCustomer.mobile_no && !validateMobileNumber(newCustomer.mobile_no) ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''"
>
<div v-if="newCustomer.mobile_no && !validateMobileNumber(newCustomer.mobile_no)" class="absolute right-3 top-1/2 transform -translate-y-1/2">
<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
</svg>
</div>
</div>
<div v-if="newCustomer.mobile_no && !validateMobileNumber(newCustomer.mobile_no)" class="mt-1 text-sm text-red-600">
Mobile number must be in format +9665xxxxxxxx
</div>
</div>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
<input 
v-model="newCustomer.email_id"
type="email"
placeholder="Enter email address"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
>
</div>
</div>

<!-- Address Information -->
<div class="space-y-4">
<h3 class="text-lg font-semibold text-gray-800">Address Information</h3>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
<input 
v-model="newCustomer.address_line1"
type="text"
placeholder="Enter address"
class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label class="block text-sm font-medium text-gray-700 mb-2">City</label>
<div class="relative">
<!-- City Dropdown -->
<div 
@click="toggleCityDropdown"
class="border-2 border-gray-200 rounded-xl p-4 bg-white cursor-pointer hover:border-green-400 hover:shadow-md transition-all duration-200 flex justify-between items-center"
>
<div class="flex items-center">
<div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
</svg>
</div>
<span class="text-gray-700 font-medium">
{{ newCustomer.city ? (cities.find(c => c.city === newCustomer.city)?.city || newCustomer.city) : 'Select city...' }}
</span>
</div>
<svg class="w-6 h-6 text-gray-400 transition-transform duration-200" :class="showCityDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
</svg>
</div>

<!-- City Dropdown Options -->
<div v-if="showCityDropdown" class="absolute z-30 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
<div class="p-4">
<!-- Search Box -->
<div class="relative mb-4">
<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
</svg>
<input 
v-model="citySearchTerm"
type="text"
placeholder="Search cities..."
class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-200"
>
</div>

<!-- Options List -->
<div class="space-y-2">
<!-- City options -->
<div 
v-for="city in filteredCities" 
:key="city.city"
@click="selectCity(city, $event)"
class="flex items-center p-3 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors duration-200 border border-transparent hover:border-purple-200"
>
<div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
</svg>
</div>
<div class="flex-1">
<div class="font-semibold text-gray-900 text-base">{{ city.city }}</div>
<div class="text-sm text-gray-600 mt-1">
<span v-if="city.state" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
📍 {{ city.state }}
</span>
</div>
</div>
</div>
</div>

<!-- No Results Message -->
<div v-if="filteredCities.length === 0 && citySearchTerm" class="text-center py-8 text-gray-500">
<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
</svg>
<p class="text-lg font-medium">No cities found</p>
<p class="text-sm">Try adjusting your search terms</p>
</div>
</div>
</div>
</div>
</div>

<div>
<label class="block text-sm font-medium text-gray-700 mb-2">Neighborhood</label>
<div class="relative">
<!-- Neighborhood Dropdown -->
<div 
@click="newCustomer.city ? toggleNeighborhoodDropdown() : null"
class="border-2 border-gray-200 rounded-xl p-4 bg-white transition-all duration-200 flex justify-between items-center"
:class="newCustomer.city ? 'cursor-pointer hover:border-green-400 hover:shadow-md' : 'cursor-not-allowed bg-gray-50 opacity-60'"
>
<div class="flex items-center">
<div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
</svg>
</div>
<span class="text-gray-700 font-medium" :class="!newCustomer.city ? 'text-gray-400' : ''">
{{ newCustomer.neighborhood || (newCustomer.city ? 'Select neighborhood...' : 'Select city first...') }}
</span>
</div>
<svg class="w-6 h-6 text-gray-400 transition-transform duration-200" :class="showNeighborhoodDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
</svg>
</div>

<!-- Neighborhood Dropdown Options -->
<div v-if="showNeighborhoodDropdown" class="absolute z-30 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
<div class="p-4">
<!-- Search Box -->
<div class="relative mb-4">
<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
</svg>
<input 
v-model="neighborhoodSearchTerm"
type="text"
placeholder="Search neighborhoods..."
class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-200"
>
</div>

<!-- Options List -->
<div class="space-y-2">
<!-- Neighborhood options -->
<div 
v-for="neighborhood in filteredNeighborhoods" 
:key="neighborhood.name"
@click="selectNeighborhood(neighborhood, $event)"
class="flex items-center p-3 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors duration-200 border border-transparent hover:border-orange-200"
>
<div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
<svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
</svg>
</div>
<div class="flex-1">
<div class="font-semibold text-gray-900 text-base">{{ neighborhood.name }}</div>
<div class="text-sm text-gray-600 mt-1">
<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
🏙️ {{ neighborhood.city }}
</span>
</div>
</div>
</div>
</div>

<!-- No City Selected Message -->
<div v-if="!newCustomer.city" class="text-center py-8 text-gray-500">
<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
</svg>
<p class="text-lg font-medium">Please select a city first</p>
<p class="text-sm">Neighborhoods will be filtered by city</p>
</div>

<!-- No Results Message -->
<div v-else-if="filteredNeighborhoods.length === 0" class="text-center py-8 text-gray-500">
<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
</svg>
<p class="text-lg font-medium">No neighborhoods found</p>
<p class="text-sm">{{ neighborhoodSearchTerm ? 'Try adjusting your search terms' : 'No neighborhoods available for this city' }}</p>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>

<!-- Modal Footer -->
<div class="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
<button 
@click="closeCreateCustomerPopup"
class="w-full sm:w-auto px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
>
Cancel
</button>
<button 
@click="createNewCustomer"
:disabled="creatingCustomer || !newCustomer.customer_name"
class="w-full sm:w-auto px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
>
<svg v-if="!creatingCustomer" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>
<div v-else class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
{{ creatingCustomer ? 'Creating...' : 'Create Customer' }}
</button>
</div>
</div>
</div>
</div>

`
			});

			app.mount("#quotation-app");
			console.log('Vue app mounted successfully');
		} catch (error) {
			console.error('Error creating Vue app:', error);
			showError('Error initializing the page: ' + error.message);
		}
	}
	
	function showError(message) {
		$('#loadingScreen').html(`
			<div class="text-center">
				<div style="color: #ef4444; font-size: 24px; margin-bottom: 16px;">⚠️</div>
				<div style="color: #ef4444; font-size: 18px; font-weight: 500;">Error Loading Page</div>
				<div style="color: #6b7280; font-size: 14px; margin-top: 8px;">${message}</div>
				<button onclick="window.location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
					Refresh Page
				</button>
			</div>
		`);
	}
};