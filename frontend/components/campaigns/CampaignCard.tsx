import type {Campaign} from "@/types/campaigns";
import {BarChart3, Calendar, MoreVertical, Trophy, Send, Search, X, Loader2} from "lucide-react";
import DropdownMenu from "@/components/campaigns/DropDownMenu";
import Toast from "@/components/ui/Toast";
import {useState, useEffect} from "react";

interface Customer {
	phone_number: string;
	is_active: boolean;
	escalation_status: boolean;
	customer_type: string;
	total_spend: number;
	customer_name: string | null;
	email: string | null;
	address: string | null;
	cart_id: string | null;
	order_history: string | null;
	socials: string | null;
	interest_groups: string | null;
	customer_quickbook_id: string | null;
	tags: string[];
	company_name: string | null;
}

interface BroadcastModalProps {
	isOpen: boolean;
	onClose: () => void;
	campaignId: string;
	onSuccess: () => void;
}

const BroadcastModal = ({ isOpen, onClose, campaignId, onSuccess }: BroadcastModalProps) => {
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
	const [searchTerm, setSearchTerm] = useState("");
	const [tagFilter, setTagFilter] = useState("");
	const [loading, setLoading] = useState(false);
	const [broadcasting, setBroadcasting] = useState(false);

	// Get unique tags from all customers
	const allTags = Array.from(new Set(customers.flatMap(customer => customer.tags)));

	// Filter customers based on search and tag filter
	const filteredCustomers = customers.filter(customer => {
		const matchesSearch = searchTerm === "" ||
			customer.phone_number.includes(searchTerm) ||
			(customer.customer_name && customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));

		const matchesTag = tagFilter === "" || customer.tags.includes(tagFilter);

		return matchesSearch && matchesTag;
	});

	// Fetch customers when modal opens
	useEffect(() => {
		const fetchCustomers = async () => {
			setLoading(true);
			try {
				const response = await fetch('/api/customers');
				if (!response.ok) throw new Error('Failed to fetch customers');
				const data = await response.json();
				setCustomers(data.customers);
			} catch (error) {
				console.error('Error fetching customers:', error);
			} finally {
				setLoading(false);
			}
		};

		if (isOpen && customers.length === 0) {
			void fetchCustomers();
		}
	}, [isOpen, customers.length]);



	const handleSelectCustomer = (phoneNumber: string) => {
		const newSelected = new Set(selectedCustomers);
		if (newSelected.has(phoneNumber)) {
			newSelected.delete(phoneNumber);
		} else {
			newSelected.add(phoneNumber);
		}
		setSelectedCustomers(newSelected);
	};

	const handleSelectAll = () => {
		if (selectedCustomers.size === filteredCustomers.length) {
			// Deselect all filtered customers
			const newSelected = new Set(selectedCustomers);
			filteredCustomers.forEach(customer => {
				newSelected.delete(customer.phone_number);
			});
			setSelectedCustomers(newSelected);
		} else {
			// Select all filtered customers
			const newSelected = new Set(selectedCustomers);
			filteredCustomers.forEach(customer => {
				newSelected.add(customer.phone_number);
			});
			setSelectedCustomers(newSelected);
		}
	};

	const handleBroadcast = async () => {
		if (selectedCustomers.size === 0) return;

		setBroadcasting(true);
		try {
			// Create targets array with phone numbers and customer names
			const targets = Array.from(selectedCustomers).map(phoneNumber => {
				const customer = customers.find(c => c.phone_number === phoneNumber);
				return {
					phone_number: phoneNumber,
					customer_name: customer?.customer_name || null
				};
			});

			const response = await fetch('/api/campaigns/broadcast', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					campaign_id: campaignId,
					customers: targets
				})
			});

			if (!response.ok) throw new Error('Failed to send broadcast');

			onSuccess();
			onClose();
			// Reset state
			setSelectedCustomers(new Set());
			setSearchTerm("");
			setTagFilter("");
		} catch (error) {
			console.error('Error sending broadcast:', error);
		} finally {
			setBroadcasting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h2 className="text-xl font-bold text-gray-900">Select Customers for Broadcast</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Filters */}
				<div className="p-6 border-b space-y-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							placeholder="Search by name or phone number..."
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					<div className="flex items-center space-x-4">
						<select
							className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							value={tagFilter}
							onChange={(e) => setTagFilter(e.target.value)}
						>
							<option value="">All Tags</option>
							{allTags.map(tag => (
								<option key={tag} value={tag}>{tag}</option>
							))}
						</select>

						<button
							onClick={handleSelectAll}
							className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
						>
							{selectedCustomers.size === filteredCustomers.length ? 'Deselect All' : 'Select All'}
						</button>

						<span className="text-sm text-gray-600">
							{selectedCustomers.size} selected
						</span>
					</div>
				</div>

				{/* Customer List */}
				<div className="flex-1 overflow-y-auto p-6">
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="w-6 h-6 animate-spin text-blue-600" />
							<span className="ml-2 text-gray-600">Loading customers...</span>
						</div>
					) : filteredCustomers.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							No customers found
						</div>
					) : (
						<div className="space-y-2">
							{filteredCustomers.map((customer) => (
								<div
									key={customer.phone_number}
									className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
									onClick={() => handleSelectCustomer(customer.phone_number)}
								>
									<input
										type="checkbox"
										checked={selectedCustomers.has(customer.phone_number)}
										onChange={() => handleSelectCustomer(customer.phone_number)}
										className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
									/>
									<div className="flex-1">
										<div className="font-medium text-gray-900">
											{customer.customer_name || 'No Name'}
										</div>
										<div className="text-sm text-gray-600">
											{customer.phone_number}
										</div>
										{customer.tags.length > 0 && (
											<div className="flex gap-1 mt-1">
												{customer.tags.map(tag => (
													<span
														key={tag}
														className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
													>
														{tag}
													</span>
												))}
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between p-6 border-t">
					<span className="text-sm text-gray-600">
						{selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
					</span>
					<div className="flex space-x-3">
						<button
							onClick={onClose}
							className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
						>
							Cancel
						</button>
						<button
							onClick={handleBroadcast}
							disabled={selectedCustomers.size === 0 || broadcasting}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
						>
							{broadcasting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									<span>Broadcasting...</span>
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									<span>Send Broadcast</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

const CampaignCard = ({
						  campaign,
						  openDropdownId,
						  onToggleDropdown,
						  onViewAnalytics,
						  onDelete
					  }: {
	campaign: Campaign;
	openDropdownId: string | null;
	onToggleDropdown: (id: string, e: React.MouseEvent) => void;
	onViewAnalytics: (id: string) => void;
	onDelete: (id: string) => void;
}) => {
	const [showBroadcastModal, setShowBroadcastModal] = useState(false);
	const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
		show: false,
		message: '',
		type: 'success'
	});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	const getStatusBadge = (status: boolean, startDate: string, endDate: string) => {
		const now = new Date()
		const start = new Date(startDate)
		const end = new Date(endDate)

		if (!status) return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Inactive</span>
		if (now < start) return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Upcoming</span>
		if (now > end) return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Ended</span>
		return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Active</span>
	}

	const handleBroadcastSuccess = () => {
		setToast({
			show: true,
			message: 'Broadcast sent successfully!',
			type: 'success'
		});
	};

	const hideToast = () => {
		setToast(prev => ({ ...prev, show: false }));
	};

	return (
		<>
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
				<div className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div className="flex-1">
							<div className="flex items-center space-x-2 mb-2">
								<h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
								{getStatusBadge(campaign.status, campaign.start_date, campaign.end_date)}
							</div>
							<p className="text-gray-600 text-sm">ID: {campaign.id}</p>
						</div>

						<div className="relative">
							<button
								onClick={(e) => onToggleDropdown(campaign.id, e)}
								className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
							>
								<MoreVertical className="w-4 h-4"/>
							</button>
							<DropdownMenu
								campaign={campaign}
								isOpen={openDropdownId === campaign.id}
								onViewAnalytics={onViewAnalytics}
								onDelete={onDelete}
							/>
						</div>
					</div>

					<p className="text-gray-700 mb-4 leading-relaxed">{campaign.description}</p>

					{/* Date Range */}
					<div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
						<div className="flex items-center space-x-1">
							<Calendar className="w-4 h-4"/>
							<span>{formatDate(campaign.start_date)}</span>
						</div>
						<span>→</span>
						<span>{formatDate(campaign.end_date)}</span>
					</div>

					{/* Prizes */}
					{campaign.prizes.length > 0 && (
						<div className="mb-4">
							<div className="flex items-center space-x-2 mb-2">
								<Trophy className="w-4 h-4 text-yellow-600"/>
								<span className="text-sm font-medium text-gray-700">
									Prizes ({campaign.prizes.length})
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{campaign.prizes.slice(0, 3).map((prize, index) => (
									<span
										key={index}
										className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"
									>
										{prize}
									</span>
								))}
								{campaign.prizes.length > 3 && (
									<span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
										+{campaign.prizes.length - 3} more
									</span>
								)}
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="flex items-center justify-between pt-4 border-t border-gray-100">
						<span className="text-xs text-gray-500">
							Created by {campaign.created_by}
						</span>
						<div className="flex items-center space-x-4">
							<button
								onClick={() => setShowBroadcastModal(true)}
								className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1"
							>
								<Send className="w-4 h-4"/>
								<span>Broadcast</span>
							</button>
							<button
								onClick={() => onViewAnalytics(campaign.id)}
								className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
							>
								<BarChart3 className="w-4 h-4"/>
								<span>View Analytics</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<BroadcastModal
				isOpen={showBroadcastModal}
				onClose={() => setShowBroadcastModal(false)}
				campaignId={campaign.id}
				onSuccess={handleBroadcastSuccess}
			/>

			{toast.show && (
				<Toast
					message={toast.message}
					type={toast.type}
					show={toast.show}
					onClose={hideToast}
				/>
			)}
		</>
	)
}

export default CampaignCard;