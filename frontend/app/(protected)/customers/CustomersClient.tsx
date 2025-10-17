"use client";
import React, {useEffect, useState, useMemo} from "react";
import {UserData} from "@/types/user";
import {Search, Filter, Tag, X, ArrowUpDown, Upload} from "lucide-react";
import {DashboardWorkspaceTitledBlock, PageHeading} from "@/components/ui/Structure";
import {UserCard} from "@/components/ui/Cards";
import { UsersApiResponse } from "@/types/responses";
import PageLoader from "@/components/ui/PageLoader";
import Link from "next/link";

export default function CustomersClient() {
	const [loading, setLoading] = useState(true);
	const [userData, setUserData] = useState<UsersApiResponse>({
		customers: []
	});
	const [error, setError] = useState<string | null>(null);

	// Search and filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagSearchQuery, setTagSearchQuery] = useState("");

	// Sorting states
	const [sortOption, setSortOption] = useState("name-asc");

	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	async function fetchCustomers() {
		setLoading(true);
		try {
			const res = await fetch('/api/customers', {
				method: 'GET',
				headers: { 'Accept': 'application/json' },
			});
			if (!res.ok) throw new Error(`Error: ${res.status}`);
			const data = await res.json();
			setUserData(data);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { fetchCustomers(); }, []);

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		userData.customers.forEach(user => {
			if (user.tags && Array.isArray(user.tags)) {
				user.tags.forEach((tag: string) => {
					if (typeof tag === 'string') tagSet.add(tag.toLowerCase());
				});
			}
		});
		return Array.from(tagSet).sort();
	}, [userData.customers]);

	const filteredTagOptions = useMemo(() => {
		if (!tagSearchQuery.trim()) return allTags;
		return allTags.filter(tag => tag.includes(tagSearchQuery.toLowerCase()));
	}, [allTags, tagSearchQuery]);

	const addTag = (tag: string) => {
		if (!selectedTags.includes(tag)) setSelectedTags([...selectedTags, tag]);
		setTagSearchQuery("");
		setCurrentPage(1);
	};

	const removeTag = (tag: string) => {
		setSelectedTags(selectedTags.filter(t => t !== tag));
		setCurrentPage(1);
	};

	const clearAllTags = () => {
		setSelectedTags([]);
		setCurrentPage(1);
	};

	const filteredUsers = useMemo(() => {
		let filtered = userData.customers;
		if (customerTypeFilter !== "all") {
			filtered = filtered.filter(user => user.customer_type?.toLowerCase() === customerTypeFilter.toLowerCase());
		}
		if (selectedTags.length > 0) {
			filtered = filtered.filter(user => {
				if (!user.tags || !Array.isArray(user.tags)) return false;
				const userTags = user.tags.map(tag => typeof tag === 'string' ? tag.toLowerCase() : '');
				return selectedTags.every(selectedTag => userTags.includes(selectedTag.toLowerCase()));
			});
		}
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter(user => {
				const name = user.customer_name?.toLowerCase() || "";
				const phone = user.phone_number?.toLowerCase() || "";
				const userTags = (user.tags || []).join(' ').toLowerCase();
				return name.includes(query) || phone.includes(query) || userTags.includes(query);
			});
		}
		return filtered;
	}, [userData.customers, customerTypeFilter, searchQuery, selectedTags]);

	const sortedUsers = useMemo(() => {
		const [, direction] = sortOption.split('-'); // Removed the unused '_' variable
		return [...filteredUsers].sort((a, b) => {
			const valA = a.customer_name?.toLowerCase() || "";
			const valB = b.customer_name?.toLowerCase() || "";
			if (valA < valB) return direction === 'asc' ? -1 : 1;
			if (valA > valB) return direction === 'asc' ? 1 : -1;
			return 0;
		});
	}, [filteredUsers, sortOption]);

	const paginatedUsers = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
	}, [sortedUsers, currentPage, itemsPerPage]);

	const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

	useEffect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			setCurrentPage(totalPages);
		} else if (totalPages === 0) {
			setCurrentPage(1);
		}
	}, [currentPage, totalPages]);


	if (loading) return <PageLoader text={"Loading Dashboard..."}/>

	return (
		<main className="flex min-h-screen flex-col p-8 gap-6 w-full">
			<div className="flex justify-between">
				<PageHeading title={"Users"} description={"Manage and monitor all registered users"}/>
				<Link
					href="/customers/import"
					className="h-min text-sm flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200"
				>
					<Upload className="w-4 h-4" />
					Import Customers
				</Link>
			</div>

			{error && (
				<div className="space-y-2">
					<div className="text-sm text-red-500">There was an error: {error}</div>
				</div>
			)}

			{/* --- CONTROLS SECTION (REVISED LAYOUT) --- */}
			<div className="space-y-4">
				{/* Search Inputs */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
						<input
							type="text"
							placeholder="Search by name, phone, or tags..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
						/>
					</div>
					<div className="relative">
						<Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
						<input
							type="text"
							placeholder="Search tags to filter by..."
							value={tagSearchQuery}
							onChange={(e) => setTagSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
						/>
						{tagSearchQuery && filteredTagOptions.length > 0 && (
							<div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
								{filteredTagOptions.map(tag => (
									<div
										key={tag}
										className="px-4 py-2 cursor-pointer hover:bg-gray-100"
										onClick={() => addTag(tag)}
									>
										{tag}
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Filter/Sort Dropdowns */}
				<div className="flex flex-wrap items-center gap-4 text-sm">
					<div className="flex items-center gap-2">
						<span>Show:</span>
						<select
							value={itemsPerPage}
							onChange={e => {
								setItemsPerPage(Number(e.target.value));
								setCurrentPage(1);
							}}
							className="px-2 py-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
						>
							<option value={10}>10 per page</option>
							<option value={20}>20 per page</option>
							<option value={50}>50 per page</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-gray-500" />
						<select
							value={customerTypeFilter}
							onChange={(e) => {
								setCustomerTypeFilter(e.target.value);
								setCurrentPage(1);
							}}
							className="px-3 py-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
						>
							<option value="all">All Types</option>
							<option value="B2B">B2B</option>
							<option value="D2C">D2C</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<ArrowUpDown className="h-4 w-4 text-gray-500" />
						<select
							value={sortOption}
							onChange={(e) => setSortOption(e.target.value)}
							className="px-3 py-1.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
						>
							<option value="name-asc">Sort by: Name (A-Z)</option>
							<option value="name-desc">Sort by: Name (Z-A)</option>
						</select>
					</div>
				</div>

				{/* Selected Tags */}
				{selectedTags.length > 0 && (
					<div className="flex flex-wrap gap-2 mt-2">
						{selectedTags.map(tag => (
							<span
								key={tag}
								className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
							>
                         {tag}
								<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </span>
						))}
						<button
							onClick={clearAllTags}
							className="text-blue-600 hover:text-blue-800 text-xs"
						>
							Clear All
						</button>
					</div>
				)}
			</div>

			<DashboardWorkspaceTitledBlock heading={"All Users"}>
				{paginatedUsers.length > 0 ? (
					paginatedUsers.map((data: UserData, i: number) => (
						<UserCard userData={data} key={data.customer_quickbook_id || data.phone_number || i} onUserDeleted={fetchCustomers}/>
					))
				) : (
					<div className="text-center py-8 text-gray-500">
						<p className="text-lg font-medium">No users found</p>
						<p className="text-sm">Try adjusting your search or filter criteria</p>
					</div>
				)}
			</DashboardWorkspaceTitledBlock>

			{/* --- PAGINATION SECTION (MOVED TO BOTTOM) --- */}
			{totalPages > 1 && (
				<div className="flex flex-col sm:flex-row gap-4 justify-between items-center text-sm text-gray-600 mt-4">
					<div>
						Showing{' '}
						<strong>
							{sortedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
							-
							{Math.min(currentPage * itemsPerPage, sortedUsers.length)}
						</strong>{' '}
						of <strong>{sortedUsers.length}</strong> users
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
							disabled={currentPage === 1}
							className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>
						<span>
                      Page {currentPage} of {totalPages}
                   </span>
						<button
							onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
							disabled={currentPage === totalPages}
							className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</main>
	);
}
