"use client";

import React, {useEffect, useState} from "react";
import {ChevronDown, FileText, Phone, Search, Send, Users, X} from "lucide-react";
import Toast from "@/components/ui/Toast";
import PageLoader from "@/components/ui/PageLoader";
import DynamicValueDropdown from "./_components/DynamicValueDropdown";
import Spinner from "@/components/ui/Spinner";
import JobStatusModal from "./_components/JobStatusModal";

interface DynamicValuesResponse {
	frontend_payload: {
		campaign_id?: string;
		to: string[];
		variables: Array<{
			name: string;
			value: string;
		}>;
	};
	dynamic_values: string[];
	route: string;
}

interface Customer {
	phone_number: string;
	is_active: boolean;
	escalation_status: boolean;
	customer_type: "D2C" | "B2B";
	total_spend: number;
	customer_name: string | null;
	email: string | null;
	address: string | null;
	cart_id: string | null;
	order_history: string;
	socials: string;
	customer_quickbook_id: string | null;
	tags: string[];
	interest_groups: string;
	company_name: string | null;
}

interface Template {
	id: string;
	name: string;
	language: string;
	status: string;
	category: string;
}

interface TemplateVariable {
	name: string;
	type: string;
	example: string;
}

interface TemplateComponent {
	type: string;
	format: string | null;
	text: string | null;
	variables: TemplateVariable[];
}

interface TemplateDetails {
	id: string;
	name: string;
	language: string;
	status: string;
	category: string;
	components: TemplateComponent[];
	total_variables: number;
}

interface ApiResponse {
	customers: Customer[];
	total: number;
}

interface ResponseApiResponse {
	job_id: string;
	status: string;
	message: string;
	template_id: string;
	template_name: string;
	total_recipients: number;
	estimated_completion_time: string;
}

type CustomerTypeFilter = "All" | "B2B" | "D2C";

// New interface to handle unique variable keys
// interface UniqueTemplateVariable extends TemplateVariable {
// 	uniqueId: string;
// }

const PageHeading = ({ title, description }: { title: string; description: string }) => (
	<div className="mb-6">
		<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
		<p className="text-gray-600 mt-2">{description}</p>
	</div>
);

export default function BroadcastClient() {
	const [loading, setLoading] = useState(false);
	const [templatesLoading, setTemplatesLoading] = useState(false);
	const [dynamicValuesLoading, setDynamicValuesLoading] = useState(false);
	const [templateDetailsLoading, setTemplateDetailsLoading] = useState(false);

	const [customers, setCustomers] = useState<Customer[]>([]);
	const [templates, setTemplates] = useState<Template[]>([]);
	const [dynamicValues, setDynamicValues] = useState<string[]>([]);
	const [templateDetails, setTemplateDetails] = useState<TemplateDetails | null>(null);
	const [responseData, setResponseData] = useState<null | ResponseApiResponse>(null)

	const [searchQuery, setSearchQuery] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<string>("");
	const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
	const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerTypeFilter>("All");
	const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>([]);

	const [error, setError] = useState<boolean | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [sending, setSending] = useState(false);
	const [showToast, setShowToast] = useState(false);

	// Fetch customers from API
	const fetchCustomers = async () => {
		setLoading(true);
		try {
			const response = await fetch('/api/customers');
			const data: ApiResponse = await response.json();
			setCustomers(data.customers);
		} catch (error) {
			console.error('Error fetching customers:', error);
		} finally {
			setLoading(false);
		}
	};

	// Fetch templates from API
	const fetchTemplates = async () => {
		setTemplatesLoading(true);
		try {
			const response = await fetch('/api/templates/list');
			if (!response.ok) throw new Error('Failed to fetch templates');
			const templatesData: Template[] = await response.json();
			setTemplates(templatesData);
		} catch (error) {
			console.error('Error fetching templates:', error);
		} finally {
			setTemplatesLoading(false);
		}
	};

	// Fetch template details and fix variable initialization
	const fetchTemplateDetails = async (templateName: string) => {
		setTemplateDetailsLoading(true);
		try {
			const response = await fetch(`/api/templates/${templateName}`);
			if (!response.ok) throw new Error('Failed to fetch template details');
			const details: TemplateDetails = await response.json();
			setTemplateDetails(details);

			// Initialize a unique state for each variable
			const variables: Record<string, string> = {};
			details.components.forEach((component, compIndex) => {
				component.variables.forEach((variable, varIndex) => {
					// Create a unique key for each variable input
					const uniqueKey = `${component.type}-${variable.name}-${compIndex}-${varIndex}`;
					variables[uniqueKey] = '';
				});
			});
			setTemplateVariables(variables);
		} catch (error) {
			console.error('Error fetching template details:', error);
		} finally {
			setTemplateDetailsLoading(false);
		}
	};

	const fetchDynamicValues = async () => {
		setDynamicValuesLoading(true);
		try {
			const response = await fetch('/api/templates/structure');
			if (!response.ok) throw new Error('Failed to fetch dynamic values');
			const data: DynamicValuesResponse = await response.json();
			setDynamicValues(data.dynamic_values);
		} catch (error) {
			console.error('Error fetching dynamic values:', error);
		} finally {
			setDynamicValuesLoading(false);
		}
	};

	useEffect(() => {
		fetchCustomers();
		fetchTemplates();
		fetchDynamicValues();
	}, []);

	// Handle template selection
	useEffect(() => {
		if (selectedTemplate) {
			fetchTemplateDetails(selectedTemplate);
		} else {
			setTemplateDetails(null);
			setTemplateVariables({});
		}
	}, [selectedTemplate]);

	// Filter customers based on search query and customer type
	// TODO: Make this server side searched
	const filteredCustomers = customers.filter(customer => {
		const searchLower = searchQuery.toLowerCase();
		const customerName = customer.customer_name || customer.company_name || '';
		const phoneNumber = customer.phone_number || '';

		// Apply search filter
		const matchesSearch = (
			customerName.toLowerCase().includes(searchLower) ||
			phoneNumber.includes(searchQuery) ||
			customer.customer_type.toLowerCase().includes(searchLower)
		);

		// Apply customer type filter
		const matchesCustomerType = customerTypeFilter === "All" || customer.customer_type === customerTypeFilter;

		return matchesSearch && matchesCustomerType;
	});

	// Get available customers (not already selected)
	const availableCustomers = filteredCustomers.filter(
		customer => !selectedPhoneNumbers.includes(customer.phone_number)
	);

	const addPhoneNumber = (phoneNumber: string) => {
		if (!selectedPhoneNumbers.includes(phoneNumber)) {
			setSelectedPhoneNumbers([...selectedPhoneNumbers, phoneNumber]);
			setIsDropdownOpen(false);
			setSearchQuery("");
		}
	};

	// Select all available customers
	const selectAllAvailable = () => {
		const phoneNumbersToAdd = availableCustomers.map(customer => customer.phone_number);
		setSelectedPhoneNumbers([...selectedPhoneNumbers, ...phoneNumbersToAdd]);
		setIsDropdownOpen(false);
		setSearchQuery("");
	};

	const removePhoneNumber = (phoneToRemove: string) => {
		setSelectedPhoneNumbers(selectedPhoneNumbers.filter(phone => phone !== phoneToRemove));
	};

	// Handle variable change using the unique key
	const handleTemplateVariableChange = (uniqueKey: string, value: string) => {
		setTemplateVariables(prev => ({
			...prev,
			[uniqueKey]: value
		}));
	};

	// Function to render template text with variable inputs
	const renderTemplateWithValues = (text: string, variables: TemplateVariable[], componentType: string, compIndex: number) => {
		if (!text) return null;

		const parts = text.split(/(\*\{\{[^}]+\}\}\*|\{\{[^}]+\}\})/);
		let variableIndex = 0;

		return (
			<div className="space-y-2 ">
				{parts.map((part, index) => {
					const variableMatch = part.match(/\*?\{\{([^}]+)\}\}\*?/);

					if (variableMatch) {
						const variableName = variableMatch[1];
						const variable = variables.find(v => v.name === variableName);

						if (variable) {
							const uniqueKey = `${componentType}-${variable.name}-${compIndex}-${variableIndex}`;
							const value = templateVariables[uniqueKey] || '';
							variableIndex++;

							return (
								<div key={index} className={`inline-block mt-auto mb-0 underline p-1 min-w-[10ch] ${value ? "text-black" : "text-gray-400"}`}>
									{value || 'Fill variables below...'}
								</div>
							);
						}
					}
					return (
						<span key={index} className="whitespace-pre-line ">
							{part}
						</span>
					);
				})}
			</div>
		);
	};

	// Refactored send function to handle unique keys and map back to variable names
	const sendBulkMessage = async () => {
		if (selectedPhoneNumbers.length === 0 || !selectedTemplate || !templateDetails) return;

		// Check if all required variables are filled based on the unique keys
		const allVariablesFilled = Object.values(templateVariables).every(value => value.trim().length > 0);
		if (!allVariablesFilled) return;

		setSending(true);

		try {
			const targets = selectedPhoneNumbers.map(phoneNumber => {
				const customer = customers.find(c => c.phone_number === phoneNumber);
				return {
					phone_number: phoneNumber,
					customer_name: customer?.customer_name || null
				};
			});

			// Map unique keys back to variable names for the backend
			const variablesToSend: Record<string, string> = {};
			Object.entries(templateVariables).forEach(([uniqueKey, value]) => {
				const parts = uniqueKey.split('-');
				const variableName = parts[1];
				variablesToSend[variableName] = value;
			});

			const response = await fetch(`/api/templates/send/${templateDetails.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					templateName: selectedTemplate,
					variables: variablesToSend,
					to: targets
				})
			});

			if (response.ok) {
				const originalCount = selectedPhoneNumbers.length;
				setSelectedPhoneNumbers([]);
				setSelectedTemplate("");
				setTemplateDetails(null);
				setTemplateVariables({});
				setSuccess(`Message sent to ${originalCount} recipients!`);
				setShowToast(true);

				setResponseData(await response.json())
			} else {
				throw new Error('Failed to send message');
			}
		} catch (error) {
			console.error('Error sending message:', error);
			setError(true);
			setShowToast(true);
		} finally {
			setSending(false);
		}
	};

	// Get customer display name
	const getCustomerDisplayName = (customer: Customer) => {
		return customer.customer_name || customer.company_name || `${customer.customer_type} Customer`;
	};

	// Get selected customer info for display
	const getSelectedCustomerInfo = (phoneNumber: string) => {
		const customer = customers.find(c => c.phone_number === phoneNumber);
		if (!customer) return { name: 'Unknown', phone: phoneNumber };

		return {
			name: getCustomerDisplayName(customer),
			phone: phoneNumber
		};
	};

	// Check if form is valid for sending
	const isFormValid = () => {
		if (selectedPhoneNumbers.length === 0 || !selectedTemplate || !templateDetails) return false;

		// all variables filled
		return Object.values(templateVariables).every(value => value.trim().length > 0);
	};

	if (loading) {
		return <PageLoader text={"Loading Broadcast..."}/>
	}

	if (responseData) {
		const closeModal = () => setResponseData(null)
		return <JobStatusModal jobData={responseData} onClose={closeModal}/>
	}

	return (
		<div className="p-8 flex flex-col gap-6 h-full">
			<PageHeading
				title="Broadcast"
				description="Send template messages to multiple customers at once"
			/>

			{/* Template Selection */}
			<div className="flex flex-col gap-2">
				<label className="text-sm font-semibold text-gray-700">Select Template</label>
				<div className="relative">
					<FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
					<select
						value={selectedTemplate}
						onChange={(e) => setSelectedTemplate(e.target.value)}
						className="w-full pl-10 pr-4 p-3 bg-neutral-100 rounded-lg border border-neutral-400 focus:outline-1 focus:outline-neutral-400 duration-100"
						disabled={templatesLoading}
					>
						<option value="">
							{templatesLoading ? 'Loading templates...' : 'Choose a template'}
						</option>
						{templates.map((template) => (
							<option key={template.id} value={template.name}>
								{template.name} ({template.category})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Template Preview and Variables */}
			{selectedTemplate && templateDetails && (
				<div className="flex flex-col gap-4 ">
					<label className="text-sm font-semibold text-gray-700">Template Preview & Variables</label>

					{templateDetailsLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
							Loading template details...
						</div>
					) : (
						<div className="space-y-6">
							{/* Template Preview */}
							<div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
								<div className="bg-white p-6 rounded-lg shadow-sm border">
									<div className="space-y-4">
										{templateDetails.components.map((component, index) => (
											<div key={index}>
												{component.type === 'header' && component.text && (
													<div className="border-b border-gray-200 pb-4">
														<div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Header</div>
														<div className="font-bold text-xl text-gray-900">
															{renderTemplateWithValues(component.text, component.variables, component.type, index)}
														</div>
													</div>
												)}

												{component.type === 'body' && component.text && (
													<div className="py-4">
														<div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Body</div>
														<div className="text-gray-800 leading-relaxed">
															{renderTemplateWithValues(component.text, component.variables, component.type, index)}
														</div>
													</div>
												)}

												{component.type === 'footer' && component.text && (
													<div className="border-t border-gray-200 pt-4">
														<div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Footer</div>
														<div className="text-sm text-gray-500">
															{renderTemplateWithValues(component.text, component.variables, component.type, index)}
														</div>
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							</div>

							{/* Template Variables Input Section */}
							<div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="text-lg font-semibold text-gray-900">Template Variables</h3>
										<p className="text-sm text-gray-500">Fill in all variables to customize your message</p>
									</div>
									<div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
										{templateDetails.total_variables} variables
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{templateDetails.components.flatMap((component, compIndex) =>
										component.variables.map((variable, varIndex) => {
											const uniqueKey = `${component.type}-${variable.name}-${compIndex}-${varIndex}`;

											if (dynamicValuesLoading) return <Spinner key={uniqueKey+"sign"}/>
											return <DynamicValueDropdown
												key={uniqueKey}
												uniqueKey={uniqueKey}
												value={templateVariables[uniqueKey] || ''}
												variable={variable}
												dynamicValues={dynamicValues}
												onChange={handleTemplateVariableChange}
											/>

										})
									)}
								</div>

								{/* Progress Indicator */}
								<div className="mt-6 p-4 bg-gray-50 rounded-lg">
									<div className="flex justify-between items-center mb-2">
										<span className="text-sm font-medium text-gray-700">Variables Completed</span>
										<span className="text-sm text-gray-600">
											{Object.values(templateVariables).filter(v => v.trim().length > 0).length} / {templateDetails.total_variables}
										</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-blue-500 h-2 rounded-full transition-all duration-300"
											style={{
												width: `${(Object.values(templateVariables).filter(v => v.trim().length > 0).length / templateDetails.total_variables) * 100}%`
											}}
										></div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Customer Selection Section */}
			<div className="flex flex-col gap-4 mb-200">
				<div className="flex flex-col gap-2">
					<label className="text-sm font-semibold text-gray-700">Add Recipients</label>
					<div className="relative">
						<button
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className="w-full flex items-center justify-between p-3 bg-neutral-100 rounded-full font-semibold border border-neutral-400 focus:outline-1 focus:outline-neutral-400 duration-100 hover:bg-neutral-50"
							disabled={loading}
						>
							<div className="flex items-center gap-2">
								<Phone className="text-gray-400" size={18} />
								<span className="text-gray-500">
									{loading ? 'Loading customers...' : 'Select customers to message'}
								</span>
							</div>
							<ChevronDown
								className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
								size={18}
							/>
						</button>

						{/* Dropdown */}
						{isDropdownOpen && (
							<div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-150 overflow-hidden">
								{/* Filter Controls */}
								<div className="p-3 border-b border-neutral-200 space-y-3">
									{/* Customer Type Filter */}
									<div>
										<label className="text-xs font-medium text-gray-600 mb-2 block">Customer Type</label>
										<div className="flex gap-2">
											{(["All", "B2B", "D2C"] as CustomerTypeFilter[]).map((type) => (
												<button
													key={type}
													onClick={() => setCustomerTypeFilter(type)}
													className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
														customerTypeFilter === type
															? 'bg-blue-100 text-blue-700 border border-blue-200'
															: 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
													}`}
												>
													{type}
												</button>
											))}
										</div>
									</div>

									{/* Search Input */}
									<div className="relative">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
										<input
											type="text"
											placeholder="Search customers..."
											className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-blue-500"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
								</div>

								{/* Select All Button */}
								{availableCustomers.length > 0 && (
									<div className="p-2 bg-blue-50 border-b border-blue-200">
										<button
											onClick={selectAllAvailable}
											className="w-full flex items-center justify-center gap-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
										>
											<Users size={16} />
											<span>Select All {availableCustomers.length} Customer{availableCustomers.length !== 1 ? 's' : ''}</span>
										</button>
									</div>
								)}

								{/* Customer List */}
								<div className="max-h-250 overflow-y-auto">
									{availableCustomers.length > 0 ? (
										availableCustomers.map((customer) => (
											<button
												key={customer.phone_number}
												onClick={() => addPhoneNumber(customer.phone_number)}
												className="w-full text-left p-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 transition-colors"
											>
												<div className="flex justify-between items-center">
													<div>
														<div className="font-medium text-gray-900">
															{getCustomerDisplayName(customer)}
														</div>
														<div className="text-sm text-gray-500">
															{customer.phone_number} •
															<span className={`ml-1 font-medium ${
																customer.customer_type === 'B2B' ? 'text-blue-600' : 'text-green-600'
															}`}>
																{customer.customer_type}
															</span>
															{customer.is_active && (
																<span className="ml-1 text-green-600">• Active</span>
															)}
														</div>
													</div>
												</div>
											</button>
										))
									) : (
										<div className="p-4 text-center text-gray-500">
											{searchQuery || customerTypeFilter !== "All"
												? 'No customers found matching your filters'
												: 'No more customers available'}
										</div>
									)}
								</div>

								{/* Results Summary */}
								<div className="p-2 bg-gray-50 border-t border-neutral-200">
									<div className="text-xs text-gray-500 text-center">
										Showing {availableCustomers.length} of {filteredCustomers.length} customers
										{customerTypeFilter !== "All" && (
											<span className="ml-1">({customerTypeFilter} only)</span>
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Selected Recipients */}
				{selectedPhoneNumbers.length > 0 && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<label className="text-sm font-semibold text-gray-700">
								Selected Recipients ({selectedPhoneNumbers.length})
							</label>
							<button
								onClick={() => setSelectedPhoneNumbers([])}
								className="text-xs text-red-600 hover:text-red-800 font-medium"
							>
								Clear All
							</button>
						</div>
						<div className="flex flex-wrap gap-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200 max-h-32 overflow-y-auto">
							{selectedPhoneNumbers.map((phoneNumber) => {
								const customerInfo = getSelectedCustomerInfo(phoneNumber);
								return (
									<div
										key={phoneNumber}
										className="flex items-center gap-2 bg-white px-3 py-2 rounded-full border border-neutral-300 text-sm"
									>
										<div className="flex flex-col">
											<span className="font-medium">{customerInfo.name}</span>
											<span className="text-xs text-gray-500">{customerInfo.phone}</span>
										</div>
										<button
											onClick={() => removePhoneNumber(phoneNumber)}
											className="text-red-500 hover:text-red-700 transition-colors ml-1"
										>
											<X size={14} />
										</button>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Send Button */}
			<div className="sticky bottom-0 bg-white pt-4">
				<div className="flex justify-end">
					<div className="hover:shadow-xl rounded-full duration-200">
						<button
							onClick={sendBulkMessage}
							disabled={sending || !isFormValid()}
							className={`px-6 py-4 rounded-full items-center justify-center cursor-pointer flex text-white font-semibold gap-2 transition-all duration-200 ${
								sending || !isFormValid()
									? "bg-gray-400 cursor-not-allowed"
									: "bg-blue-500 hover:bg-blue-600 hover:scale-105"
							}`}
						>
							{sending ? (
								<>
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									<span>Sending...</span>
								</>
							) : (
								<>
									<Send size={20} />
									<span>Send to {selectedPhoneNumbers.length} recipient{selectedPhoneNumbers.length !== 1 ? 's' : ''}</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Click outside to close dropdown */}
			{isDropdownOpen && (
				<div
					className="fixed inset-0 z-5"
					onClick={() => setIsDropdownOpen(false)}
				/>
			)}

			{(error && showToast) && (
				<Toast
					type={"error"}
					message="Oops, we ran into a problem. Refresh page & if the issue persists, contact the developer."
					onClose={() => setShowToast(false)}
				/>
			)}
			{(!!success && showToast) && (
				<Toast
					type={"success"}
					message={success}
					onClose={() => setShowToast(false)}
				/>
			)}
		</div>
	);
}