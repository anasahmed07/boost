"use client";

import {useState, useEffect, useCallback} from 'react';
import {
	ChevronLeft,
	ChevronRight,
	Edit3,
	Save,
	X,
	Plus,
	User,
	Building,
	Phone,
	DollarSign,
	ShoppingCart,
	Clock,
	Users,
	AlertCircle,
	Settings,
	Pencil,
	ChevronDown
} from 'lucide-react';

import {UserData} from "@/types/user";
import Spinner from "@/components/ui/Spinner";

interface PropertiesPanelProps {
	phone: string;
	escalationStatus: boolean | null;
}

export default function PropertiesPanel({ phone, escalationStatus }: PropertiesPanelProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState({
		customer_name: '',
		email: '',
		address: '',
		company_name: '',
		tags: [] as string[]
	});
	const [newTag, setNewTag] = useState('');
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
	const [editableSectionExpanded, setEditableSectionExpanded] = useState(false);

	// Fetch user data
	const fetchUserData = useCallback(async () => {
		if (!phone) return;

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/users/${phone}`);
			if (!response.ok) {
				throw new Error('Failed to fetch user data');
			}
			const data: UserData = await response.json();
			setUserData(data);

			// Initialize edit data
			setEditData({
				customer_name: data.customer_name || '',
				email: data.email || '',
				address: data.address || '',
				company_name: data.company_name || '',
				tags: data.tags || []
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	}, [phone]);

	useEffect(() => {
		if (phone && isExpanded) {
			void fetchUserData();
		}
	}, [fetchUserData, phone, isExpanded]);

	// Save changes
	const handleSave = async () => {
		setSaveStatus('saving');

		try {
			const response = await fetch(`/api/users/${phone}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(editData),
			});

			if (!response.ok) {
				throw new Error('Failed to save changes');
			}

			setSaveStatus('success');
			setIsEditing(false);

			// Refresh data
			await fetchUserData();

			// Clear success status after 3 seconds
			setTimeout(() => setSaveStatus('idle'), 3000);
		} catch (err) {
			console.log(err)
			// setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
		}
	};

	// Add tag
	const addTag = () => {
		console.log("TAG")
		if (newTag.trim() && !editData.tags.includes(newTag.trim())) {
			//
			//
			//
			// THIS IS AN EASTER EGG TO ENABLE DEVELOPER ROLE PLEASE IGNORE IT
			//
			//
			//
			if (newTag.toLowerCase() === "developer" || newTag.toLowerCase() === "developers" || newTag.toLowerCase() === "dev") {
				if (editData.tags.includes("you have been hacked")) {
					alert("Wow! You really are persistent!\n\nYou have successfully unlocked developer mode! 🎉");
					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, "developer"]
					}));
					return
				} else if (editData.tags.includes("add \"developer\" one more time to get admin access")) {
					const bozo = prompt("Enter your email");
					const bozo2 = prompt("Enter your password");
					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, "you have been hacked"]
					}));
					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, `${bozo?.trim().toLowerCase()}`]
					}));
					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, `${bozo2?.trim().toLowerCase()}`]
					}));
					return
				} else if (editData.tags.includes("still not a developer haha")) {
					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, "add \"developer\" one more time to get admin access"]
					}));
					return
				} else if (editData.tags.includes("not a developer")) {
					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, "still not a developer haha"]
					}));
					return
				} else {

					setEditData(prev => ({
						...prev,
						tags: [...prev.tags, "not a developer"]
					}));
				}
			} else {

				setEditData(prev => ({
					...prev,
					tags: [...prev.tags, newTag.trim().toLowerCase()]
				}));
			}
			setNewTag('');
		}
	};

	// Remove tag
	const removeTag = (index: number) => {
		setEditData(prev => ({
			...prev,
			tags: prev.tags.filter((_, i) => i !== index)
		}));
	};

	// Cancel editing
	const handleCancel = () => {
		setIsEditing(false);
		if (userData) {
			setEditData({
				customer_name: userData.customer_name || '',
				email: userData.email || '',
				address: userData.address || '',
				company_name: userData.company_name || '',
				tags: userData.tags || []
			});
		}
		setSaveStatus('idle');
	};

	// Property display component
	const PropertyRow = ({ icon, label, value, className = "" }: {
		icon: React.ReactNode;
		label: string;
		value: string | undefined | null;
		className?: string;
	}) => (
		<div className={`flex items-start gap-2 p-2 rounded-lg  ${className}`}>
			<div className="text-yellow-600 mt-0.5 flex-shrink-0">{icon}</div>
			<div className="min-w-0 flex-1">
				<div className="text-xs font-medium text-black mb-1">{label}</div>
				<div className="text-sm text-gray-700 break-words">
					{value !== null && value !== undefined && value !== '' ? String(value) : 'Not set'}
				</div>
			</div>
		</div>
	);

	return (
		<div className={` group flex flex-col bg-neutral-100 shadow-lg text-black transition-all duration-300 ease-in-out p-2 h-full overflow-y-auto ${
			isExpanded ? 'w-1/4  xl:w-1/3 2xl:w-1/5' : 'hover:w-15 w-13 '
		}`}>


			<div className={`flex ${isExpanded ? "flex-row justify-between w-full" : "flex-col flex-1 gap-2"}  items-center self-start`}>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className={`text-black rounded-md p-1.5 transition-all duration-300 bg-yellow-400 hover:bg-yellow-500 cursor-pointer shadow-sm ${isExpanded ? "hover:translate-x-1.5" : "group-hover:-translate-x-0.75 hover:-translate-x-1.5"}`}
				>
					{isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
				</button>
				{
					isExpanded && (
						<div className="flex flex-col gap-2 items-end p-2">
							<h3 className="text-lg font-bold">Properties Panel</h3>
							{phone && (
								<p className="text-sm text-neutral-500">Phone: {phone}</p>
							)}
						</div>
					)
				}
				{
					!isExpanded && (
						<>
							<div className="py-2 h-1/2 flex items-center rounded-md bg-neutral-200 p-2 text-neutral-500 shadow-sm">
								<Pencil size={16}/>
							</div>
							<div className="py-2 h-1/2 flex items-center rounded-md bg-neutral-200 p-2 text-neutral-500 shadow-sm">
								<Settings size={16}/>
							</div>
						</>
					)
				}
			</div>
			{/* Toggle Button */}


			{/* Content */}
			{isExpanded && (
				<div className="p-4 h-full overflow-y-auto">
					{/* Header */}


					{/* Loading State */}
					{loading && (
						<div className="flex w-full justify-center">
							<Spinner/>
						</div>
					)}

					{/* Error State */}
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
							<div className="flex items-center gap-2 text-red-600 text-sm">
								<AlertCircle size={16} />
								{error}
							</div>
							<button
								onClick={fetchUserData}
								className="mt-2 text-xs text-red-700 underline hover:no-underline"
							>
								Try again
							</button>
						</div>
					)}

					{/* Data Display */}
					{userData && !loading && (
						<div className="space-y-4">
							{/* Save Status */}
							{saveStatus === 'success' && (
								<div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
									<div className="text-green-600 text-sm">Changes saved successfully!</div>
								</div>
							)}
							{saveStatus === 'error' && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-4">
									<div className="text-red-600 text-sm">Failed to save changes. Please try again.</div>
								</div>
							)}

							{/* Editable Fields */}
							<div className="space-y-3">
								<div className="rounded-lg p-3 bg-neutral-200">
									<h4 className="flex items-center justify-between font-semibold mb-3 text-sm">
										<span>
											Editable Information
										</span>
										<div className="flex items-center gap-2">
											{/* Action Buttons */}
											{(!isEditing) && (<button
												onClick={() => setEditableSectionExpanded(!editableSectionExpanded)}
												className="hover:bg-neutral-300 rounded p-1 transition-colors"
											>
												<ChevronDown
													className={`w-4 h-4 transition-transform duration-200 ${editableSectionExpanded ? '' : '-rotate-90'}`}/>
											</button>)}
										</div>
									</h4>
									<div className={`overflow-hidden transition-all space-y-2  duration-300 ease-in-out ${editableSectionExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
										{!isEditing ? (
											<button
												onClick={() => setIsEditing(true)}
												className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105"
											>
												<Edit3 size={12} />
												Edit
											</button>
										) : (
											<>
												<button
													onClick={handleSave}
													disabled={saveStatus === 'saving'}
													className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
												>
													<Save size={12} />
													{saveStatus === 'saving' ? 'Saving...' : 'Save'}
												</button>
												<button
													onClick={handleCancel}
													className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white text-xs rounded-lg transition-all duration-200 hover:scale-105"
												>
													<X size={12} />
													Cancel
												</button>
											</>
										)}
										<div className="bg-white rounded-lg p-3">
											{/* Customer Name */}
											<div className="mb-3">
												<label className="block text-xs font-medium mb-1">Customer Name</label>
												{isEditing ? (
													<input
														type="text"
														value={editData.customer_name}
														onChange={(e) => setEditData(prev => ({ ...prev, customer_name: e.target.value }))}
														className="w-full px-2 py-1.5 text-sm  border border-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300"
														placeholder="Enter customer name"
													/>
												) : (
													<div className="text-sm text-gray-700 p-2 bg-neutral-100 rounded">
														{userData.customer_name || 'Not set'}
													</div>
												)}
											</div>

											{/* Email */}
											<div className="mb-3">
												<label className="block text-xs font-medium mb-1">Email</label>
												{isEditing ? (
													<input
														type="email"
														value={editData.email}
														onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
														className="w-full px-2 py-1.5 text-sm border border-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300"
														placeholder="Enter email address"
													/>
												) : (
													<div className="text-sm text-gray-700 p-2 bg-neutral-100 rounded">
														{userData.email || 'Not set'}
													</div>
												)}
											</div>

											{/* Address */}
											<div className="mb-3">
												<label className="block text-xs font-medium mb-1">Address</label>
												{isEditing ? (
													<textarea
														value={editData.address}
														onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
														className="w-full px-2 py-1.5 text-sm border border-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300"
														placeholder="Enter address"
														rows={2}
													/>
												) : (
													<div className="text-sm text-gray-700 p-2 bg-neutral-100 rounded">
														{userData.address || 'Not set'}
													</div>
												)}
											</div>

											{/* Company Name */}
											<div className="mb-3">
												<label className="block text-xs font-medium mb-1">Company Name</label>
												{isEditing ? (
													<input
														type="text"
														value={editData.company_name}
														onChange={(e) => setEditData(prev => ({ ...prev, company_name: e.target.value }))}
														className="w-full px-2 py-1.5 text-sm border border-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300"
														placeholder="Enter company name"
													/>
												) : (
													<div className="text-sm text-gray-700 p-2 bg-neutral-100 rounded">
														{userData.company_name || 'Not set'}
													</div>
												)}
											</div>

											{/* Tags */}
											<div>
												<label className="block text-xs font-medium mb-1">Tags</label>
												{isEditing ? (
													<div>
														<div className="flex flex-wrap gap-1 mb-2">
															{editData.tags.map((tag, index) => (
																<span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
																	{tag}
																	<button
																		onClick={() => removeTag(index)}
																		className="text-yellow-600 hover:text-yellow-800"
																	>
																		<X size={12} />
																	</button>
																</span>
															))}
														</div>
														<div className="flex gap-1">
															<input
																type="text"
																value={newTag}
																onChange={(e) => setNewTag(e.target.value.toLowerCase())}
																onKeyPress={(e) => e.key === 'Enter' && addTag()}
																className="flex-1 px-2 py-1 text-xs border border-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300"
																placeholder="Add tag..."
															/>
															<button
																onClick={addTag}
																className="px-2 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded text-xs"
															>
																<Plus size={12} />
															</button>
														</div>
													</div>
												) : (
													<div className="p-2 bg-neutral-100 rounded">
														{userData.tags && userData.tags.length > 0 ? (
															<div className="flex flex-wrap gap-1">
																{userData.tags.map((tag, index) => (
																	<span key={index} className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
																		{tag}
																	</span>
																))}
															</div>
														) : (
															<span className="text-sm text-gray-500">No tags</span>
														)}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Read-only Properties */}
							<div className="space-y-1">
								<h4 className="font-semibold text-black mb-3 text-sm">Read-only Information</h4>

								<PropertyRow
									icon={<Phone size={14} />}
									label="Phone Number"
									value={userData.phone_number}
								/>

								<PropertyRow
									icon={<div className={`w-2 h-2 rounded-full ${userData.is_active ? 'bg-green-500' : 'bg-red-500'}`} />}
									label="Active Status"
									value={userData.is_active ? 'Active' : 'Inactive'}
								/>

								<PropertyRow
									icon={<AlertCircle size={14} />}
									label="Escalation Status"
									value={escalationStatus !== null ? escalationStatus ? 'Escalated' : 'Normal' :
										userData.escalation_status ? 'Escalated' : 'Normal'
									}
								/>

								<PropertyRow
									icon={<User size={14} />}
									label="Customer Type"
									value={userData.customer_type}
								/>

								<PropertyRow
									icon={<DollarSign size={14} />}
									label="Total Spend"
									value={userData.total_spend ? `Rs ${userData.total_spend.toFixed(2)}/-` : undefined}
								/>

								<PropertyRow
									icon={<ShoppingCart size={14} />}
									label="Cart ID"
									value={userData.cart_id}
								/>

								<PropertyRow
									icon={<Clock size={14} />}
									label="Order History"
									value={userData.order_history}
								/>

								<PropertyRow
									icon={<Users size={14} />}
									label="Socials"
									value={userData.socials}
								/>

								<PropertyRow
									icon={<Building size={14} />}
									label="QuickBook ID"
									value={userData.customer_quickbook_id}
								/>

								<PropertyRow
									icon={<Users size={14} />}
									label="Interest Groups"
									value={userData.interest_groups}
								/>
							</div>
						</div>
					)}

					{/* No phone provided */}
					{!phone && !loading && (
						<div className="text-center py-8 text-yellow-600">
							<User size={32} className="mx-auto mb-2 opacity-50" />
							<p className="text-sm">No phone number provided</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}