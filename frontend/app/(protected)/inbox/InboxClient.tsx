"use client";

import {useEffect, useState, useCallback, useRef} from "react";

import Toast from "@/components/ui/Toast";
import PageLoader from "@/components/ui/PageLoader";
import Spinner from "@/components/ui/Spinner";
import {PageHeading} from "@/components/ui/Structure";

import {UsersApiResponse} from "@/types/responses";
import {CustomerChats} from "@/types/user";

import InboxControls from "./_components/InboxControls";
import InboxList from "./_components/InboxList";
import Pagination from "./_components/Pagination";
import StatusAlerts from "./_components/StatusAlerts";
import ChatClient from "./_components/InPageChatClient";

type SortField = 'customer_name' | 'total_spend' | 'last_message_time' | 'updated_at' | 'phone_number';
type SortOrder = 'asc' | 'desc';

interface ExtendedUsersApiResponse extends UsersApiResponse {
	customers: CustomerChats[];
	stats?: {
		active: number;
		chatOnly: number;
		customerOnly: number;
	};
	pagination?: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

interface ApiResponse {
	customers: CustomerChats[];
	total: number;
	page: number;
	limit: number;
	total_pages: number;
	has_next: boolean;
	has_previous: boolean;
	total_escalated: number;
}

const DEFAULT_ITEMS_PER_PAGE = 25;
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEBOUNCE_DELAY = 1000; // 1 second

export default function InboxClient() {
	const [initialLoading, setInitialLoading] = useState(true);
	const [loading, setLoading] = useState(false);
	const [userData, setUserData] = useState<ExtendedUsersApiResponse>({
		customers: []
	});
	const [error, setError] = useState<string | null>(null);
	const [showToast, setShowToast] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
	const [searchQuery, setSearchQuery] = useState("");
	const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
	const [escalationFilter, setEscalationFilter] = useState<string>("all");
	const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagSearchQuery, setTagSearchQuery] = useState("");
	const [sortField, setSortField] = useState<SortField>('last_message_time');
	const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
	const [minSpend, setMinSpend] = useState<string>("");
	const [maxSpend, setMaxSpend] = useState<string>("");

	// Debounced versions of text inputs
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
	const [debouncedMinSpend, setDebouncedMinSpend] = useState("");
	const [debouncedMaxSpend, setDebouncedMaxSpend] = useState("");

	// Server-side pagination state
	const [totalItems, setTotalItems] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [totalEscalated, setTotalEscalated] = useState(0);

	// Auto-refresh state
	const [refreshProgress, setRefreshProgress] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// current phone number
	const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

	// Available tags from server
	const [allTags, setAllTags] = useState<string[]>([]);

	// Refs for debounce timers
	const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
	const minSpendTimerRef = useRef<NodeJS.Timeout | null>(null);
	const maxSpendTimerRef = useRef<NodeJS.Timeout | null>(null);
	const hasMountedRef = useRef(false);

	const showError = (message: string) => {
		setError(message);
		setShowToast(true);
	};

	const fetchCustomers = useCallback(async (
		page: number = 1,
		limit: number = DEFAULT_ITEMS_PER_PAGE,
		isAutoRefresh = false
	) => {
		try {
			if (isAutoRefresh) {
				setIsRefreshing(true);
			} else {
				setLoading(true);
			}

			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			// Add search query
			if (debouncedSearchQuery.trim()) {
				params.append('search', debouncedSearchQuery.trim());
			}

			// Add tags filter
			if (selectedTags.length > 0) {
				params.append('tags', selectedTags.join(','));
			}

			// Add customer type filter
			if (customerTypeFilter !== "all") {
				params.append('customer_type', customerTypeFilter);
			}

			// Add escalation status filter
			if (escalationFilter !== "all") {
				params.append('escalation_status', escalationFilter === "escalated" ? "true" : "false");
			}

			// Add is_active filter
			if (isActiveFilter !== "all") {
				params.append('is_active', isActiveFilter === "active" ? "true" : "false");
			}

			// Add spend filters
			if (debouncedMinSpend) {
				params.append('min_spend', debouncedMinSpend);
			}
			if (debouncedMaxSpend) {
				params.append('max_spend', debouncedMaxSpend);
			}

			// Add sorting
			params.append('sort_by', sortField);
			params.append('sort_order', sortOrder);

			const res = await fetch(`/api/chats?${params}`, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			});

			if (!res.ok) {
				const errorMessage = `Failed to load conversations (${res.status}): ${res.statusText}`;
				showError(errorMessage);
				return;
			}

			const data: ApiResponse = await res.json();

			// Transform API response to match component's expected structure
			setUserData({
				customers: data.customers,
				pagination: {
					total: data.total,
					page: data.page,
					limit: data.limit,
					totalPages: data.total_pages,
					hasNext: data.has_next,
					hasPrev: data.has_previous,
				}
			});

			setSelectedPhone(prev => {
				const stillExists = data.customers.some(c => c.phone_number === prev);
				return stillExists ? prev : data.customers[0]?.phone_number || null;
			});

			// Update pagination state
			setTotalItems(data.total);
			setTotalPages(data.total_pages);
			setTotalEscalated(data.total_escalated);

			// Extract unique tags from customers
			const tagSet = new Set<string>();
			data.customers.forEach(customer => {
				if (customer.tags && Array.isArray(customer.tags)) {
					customer.tags.forEach((tag: string) => {
						if (typeof tag === 'string') {
							tagSet.add(tag.toLowerCase());
						}
					});
				}
			});
			setAllTags(Array.from(tagSet).sort());

			setError(null);
			setShowToast(false);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load conversations. Please check your connection.";
			showError(errorMessage);
		} finally {
			setLoading(false);
			setInitialLoading(false);
			setIsRefreshing(false);
			setRefreshProgress(0);
		}
	}, [
		debouncedSearchQuery,
		selectedTags,
		customerTypeFilter,
		escalationFilter,
		isActiveFilter,
		debouncedMinSpend,
		debouncedMaxSpend,
		sortField,
		sortOrder
	]);

	// Debounce search query
	useEffect(() => {
		if (searchTimerRef.current) {
			clearTimeout(searchTimerRef.current);
		}

		searchTimerRef.current = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, DEBOUNCE_DELAY);

		return () => {
			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current);
			}
		};
	}, [searchQuery]);

	// Debounce min spend
	useEffect(() => {
		if (minSpendTimerRef.current) {
			clearTimeout(minSpendTimerRef.current);
		}

		minSpendTimerRef.current = setTimeout(() => {
			setDebouncedMinSpend(minSpend);
		}, DEBOUNCE_DELAY);

		return () => {
			if (minSpendTimerRef.current) {
				clearTimeout(minSpendTimerRef.current);
			}
		};
	}, [minSpend]);

	// Debounce max spend
	useEffect(() => {
		if (maxSpendTimerRef.current) {
			clearTimeout(maxSpendTimerRef.current);
		}

		maxSpendTimerRef.current = setTimeout(() => {
			setDebouncedMaxSpend(maxSpend);
		}, DEBOUNCE_DELAY);

		return () => {
			if (maxSpendTimerRef.current) {
				clearTimeout(maxSpendTimerRef.current);
			}
		};
	}, [maxSpend]);

	// Fetch data when debounced filters change (includes initial load)
	useEffect(() => {
		// On first mount, do initial load
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			fetchCustomers(1, itemsPerPage);
			return;
		}

		// Reset to page 1 and fetch with new filters
		// Only update currentPage if it's not already 1 to avoid unnecessary re-renders
		if (currentPage !== 1) {
			setCurrentPage(1);
		} else {
			// If already on page 1, just fetch
			fetchCustomers(1, itemsPerPage);
		}
	}, [
		debouncedSearchQuery,
		selectedTags,
		customerTypeFilter,
		escalationFilter,
		isActiveFilter,
		debouncedMinSpend,
		debouncedMaxSpend,
		sortField,
		sortOrder,
		currentPage,
		itemsPerPage,
		fetchCustomers
		// Note: currentPage, itemsPerPage and fetchCustomers intentionally excluded
	]);

	// Fetch data when page changes (but not on initial load or page 1)
	useEffect(() => {
		// Only fetch if not initial load and not page 1 (page 1 handled by filter effect)
		if (hasMountedRef.current && currentPage !== 1) {
			fetchCustomers(currentPage, itemsPerPage);
		}
	}, [currentPage, fetchCustomers, itemsPerPage]);

	// Auto-refresh timer (30 seconds)
	useEffect(() => {
		const REFRESH_INTERVAL = 30000; // 30 seconds
		const PROGRESS_UPDATE_INTERVAL = 100; // Update progress every 100ms

		const progressTimer = setInterval(() => {
			setRefreshProgress(prev => {
				const newProgress = prev + (PROGRESS_UPDATE_INTERVAL / REFRESH_INTERVAL) * 100;
				return newProgress >= 100 ? 100 : newProgress;
			});
		}, PROGRESS_UPDATE_INTERVAL);

		const refreshTimer = setInterval(() => {
			fetchCustomers(currentPage, itemsPerPage, true);
		}, REFRESH_INTERVAL);

		return () => {
			clearInterval(progressTimer);
			clearInterval(refreshTimer);
		};
	}, [currentPage, itemsPerPage, fetchCustomers]);

	const filteredTagOptions = allTags.filter(tag =>
		!tagSearchQuery.trim() || tag.includes(tagSearchQuery.toLowerCase())
	);

	const addTag = (tag: string) => {
		if (!selectedTags.includes(tag)) {
			setSelectedTags([...selectedTags, tag]);
		}
		setTagSearchQuery("");
	};

	const removeTag = (tag: string) => {
		setSelectedTags(selectedTags.filter(t => t !== tag));
	};

	const clearAllTags = () => {
		setSelectedTags([]);
	};

	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);

	const resetFilters = () => {
		setSearchQuery("");
		setCustomerTypeFilter("all");
		setEscalationFilter("all");
		setIsActiveFilter("all");
		setSelectedTags([]);
		setTagSearchQuery("");
		setMinSpend("");
		setMaxSpend("");
		setSortField('last_message_time');
		setSortOrder('desc');
		setCurrentPage(1);
	};

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortOrder(field === 'last_message_time' || field === 'updated_at' ? 'desc' : 'asc');
		}
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleItemsPerPageChange = (newItemsPerPage: number) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1);
		// Manually trigger fetch since we removed itemsPerPage from filter effect deps
		fetchCustomers(1, newItemsPerPage);
	};

	const getPageNumbers = () => {
		const delta = 2;
		const range = [];
		const rangeWithDots = [];

		for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
			range.push(i);
		}

		if (currentPage - delta > 2) {
			rangeWithDots.push(1, '...');
		} else {
			rangeWithDots.push(1);
		}

		rangeWithDots.push(...range);

		if (currentPage + delta < totalPages - 1) {
			rangeWithDots.push('...', totalPages);
		} else if (totalPages > 1) {
			rangeWithDots.push(totalPages);
		}

		return rangeWithDots;
	};

	const activeCount = userData.customers.length;

	const retryFetch = () => {
		setLoading(true);
		setError(null);
		setShowToast(false);
		fetchCustomers(currentPage, itemsPerPage);
	};

	const getStatusInfo = (status: string) => {
		switch (status) {
			case 'active':
				return {
					label: 'Active',
					color: 'bg-green-100 text-green-800 border-green-200',
					icon: <div className="w-2 h-2 bg-green-500 rounded-full" />,
					description: 'Has both chat and customer data'
				};
			case 'inactive':
				return {
					label: 'Inactive',
					color: 'bg-gray-100 text-gray-800 border-gray-200',
					icon: <div className="w-2 h-2 bg-gray-500 rounded-full" />,
					description: 'Customer is inactive'
				};
			default:
				return {
					label: 'All',
					color: 'bg-blue-100 text-blue-800 border-blue-200',
					icon: <div className="w-2 h-2 bg-blue-500 rounded-full" />,
					description: 'All customers'
				};
		}
	};

	const handleEscalationChange = (phoneNumber: string, newStatus: boolean) => {
		setUserData((prev: ExtendedUsersApiResponse) => ({
			...prev,
			customers: prev.customers.map(chat =>
				chat.phone_number === phoneNumber
					? { ...chat, escalation_status: newStatus }
					: chat
			),
		}));
	};



	if (initialLoading) return <PageLoader text={"Loading Conversations..."}/>;

	return (
		<main className="flex min-h-screen flex-col gap-6 w-full">
			<div className="flex flex-row">
				<div className={`flex h-screen overflow-y-auto flex-col ${selectedPhone ? "w-2/7" : "w-full"} p-3 gap-4 `}>
					<div className="flex items-center justify-between h-min">
						<PageHeading title={"Inbox"} description={"Manage and monitor all customer conversations"} bottomMargin={"3"}/>
						{/* Auto-refresh indicator */}
						<div className="relative w-7 h-7 flex items-center justify-center ">
							{isRefreshing ? (
								<div className="w-7 h-7 border-2 border-yellow-400 border-t-yellow-600 rounded-full animate-spin" />
							) : (
								<>
									<svg className="w-7 h-7 transform -rotate-90 absolute">
										{/* Background circle */}
										<circle
											cx="14"
											cy="14"
											r="12"
											stroke="currentColor"
											strokeWidth="2"
											fill="none"
											className="text-yellow-400 opacity-30"
										/>
										{/* Progress circle */}
										<circle
											cx="14"
											cy="14"
											r="12"
											stroke="currentColor"
											strokeWidth="2"
											fill="none"
											strokeDasharray={`${2 * Math.PI * 12}`}
											strokeDashoffset={`${2 * Math.PI * 12 * (1 - refreshProgress / 100)}`}
											className="text-yellow-600"
											strokeLinecap="round"
											style={{ transition: 'stroke-dashoffset 0.1s linear' }}
										/>
									</svg>
									<div className="text-[10px] font-medium text-yellow-700">
										{Math.ceil(30 - (refreshProgress / 100 * 30))}
									</div>
								</>
							)}
						</div>
					</div>
					<StatusAlerts
						escalatedCount={totalEscalated}
						chatOnlyCount={0}
						customerOnlyCount={0}
						loading={loading}
						error={error}
					/>
					{!error && (
						<InboxControls
							searchQuery={searchQuery}
							setSearchQuery={setSearchQuery}
							customerTypeFilter={customerTypeFilter}
							setCustomerTypeFilter={setCustomerTypeFilter}
							escalationFilter={escalationFilter}
							setEscalationFilter={setEscalationFilter}
							isActiveFilter={isActiveFilter}
							setIsActiveFilter={setIsActiveFilter}
							selectedTags={selectedTags}
							setSelectedTags={setSelectedTags}
							tagSearchQuery={tagSearchQuery}
							setTagSearchQuery={setTagSearchQuery}
							sortField={sortField}
							handleSort={handleSort}
							sortOrder={sortOrder}
							allTags={allTags}
							filteredTagOptions={filteredTagOptions}
							addTag={addTag}
							removeTag={removeTag}
							clearAllTags={clearAllTags}
							resetFilters={resetFilters}
							itemsPerPage={itemsPerPage}
							setItemsPerPage={handleItemsPerPageChange}
							itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
							loading={loading}
							isCompact={!!selectedPhone}
							minSpend={minSpend}
							setMinSpend={setMinSpend}
							maxSpend={maxSpend}
							setMaxSpend={setMaxSpend}
						/>
					)}
					{!loading && !error && (
						<div className="flex items-center justify-between text-sm text-gray-600 gap-2">
							<div>
								Showing {startItem}-{endItem} of {totalItems} conversations
								{searchQuery && ` matching "${searchQuery}"`}
								{isActiveFilter !== "all" && ` (${getStatusInfo(isActiveFilter).label} only)`}
								{customerTypeFilter !== "all" && ` (${customerTypeFilter.toUpperCase()} only)`}
								{escalationFilter !== "all" && ` (${escalationFilter === "escalated" ? "Escalated" : "Normal"} only)`}
								{selectedTags.length > 0 && ` with tags: ${selectedTags.join(', ')}`}
								{(minSpend || maxSpend) && ` (Spend: ${minSpend || '0'} - ${maxSpend || '∞'})`}
							</div>
							<div className="hidden sm:flex items-center gap-4 text-xs">
								<span className="flex items-center gap-1">
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									Active: {activeCount}
								</span>
								<span className="flex items-center gap-1">
									<div className="w-2 h-2 bg-red-500 rounded-full"></div>
									Escalated: {totalEscalated}
								</span>
							</div>
						</div>
					)}
					<div className={"flex flex-col gap-2 "}>
						{loading ? (
							<div className="flex justify-center items-center py-12">
								<Spinner size="lg" />
							</div>
						) : error ? (
							<div className="text-center py-8 text-gray-500">
								<p className="text-lg font-medium text-red-600">Unable to load conversations</p>
								<p className="text-sm">Please check your connection and try again</p>
								<button
									onClick={retryFetch}
									className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Retry
								</button>
							</div>
						) : userData.customers.length > 0 ? (
							<>
								<InboxList
									conversations={userData.customers}
									selectedChat={selectedPhone ?? ""}
									selectChat={(phone: string) => {
										setSelectedPhone(phone)
									}}
									onChatDeleted={(phoneNumber: string) => {
										setUserData(prev => ({
											...prev,
											customers: prev.customers.filter(
												chat => chat.phone_number !== phoneNumber
											),
										}));
										// Refetch to maintain accurate pagination
										fetchCustomers(currentPage, itemsPerPage);
									}}
								/>
								<Pagination
									currentPage={currentPage}
									totalPages={totalPages}
									totalItems={totalItems}
									handlePageChange={handlePageChange}
									getPageNumbers={getPageNumbers}
									loading={loading}
								/>
							</>
						) : (
							<div className="text-center py-8 text-gray-500">
								<p className="text-lg font-medium">No conversations found</p>
								<p className="text-sm">
									{(searchQuery || customerTypeFilter !== "all" || escalationFilter !== "all" || isActiveFilter !== "all" || selectedTags.length > 0 || minSpend || maxSpend)
										? "Try adjusting your search or filter criteria"
										: "No conversations available"}
								</p>
								{(searchQuery || customerTypeFilter !== "all" || escalationFilter !== "all" || isActiveFilter !== "all" || selectedTags.length > 0 || minSpend || maxSpend) && (
									<button
										onClick={resetFilters}
										className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
										disabled={loading}
									>
										Clear All Filters
									</button>
								)}
							</div>
						)}
					</div>
				</div>

				{
					selectedPhone && <div className={`h-screen overflow-y-auto flex ${selectedPhone && "flex-1"} `}>
						<ChatClient phone={selectedPhone}  setSelectedPhone={setSelectedPhone} onEscalationChange={handleEscalationChange}/>
					</div>
				}

			</div>
			<Toast
				type="error"
				message={error || "An error occurred"}
				show={showToast && error !== null}
				onClose={() => {
					setShowToast(false);
					setError(null);
				}}
				duration={8000}
			/>
		</main>
	);
}