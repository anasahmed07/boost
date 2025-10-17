'use client';

import { useState, useEffect } from 'react';
import {UserPlus} from "lucide-react";
import Link from "next/link";
// import { createClient } from "@/lib/supabase/client";

// const supabase = createClient();

interface UserMetadata {
	role?: 'admin' | 'representative' | 'super_admin';
	full_name?: string;
	name?: string;
	type?: string;
}

interface User {
	id: string;
	email?: string;
	phone?: string;
	user_metadata?: UserMetadata;
	email_confirmed_at?: string;
	created_at: string;
	last_sign_in_at?: string;
}

export default function TeamUsers() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [updatingUser, setUpdatingUser] = useState<string | null>(null);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			const response = await fetch('/api/admin/users');
			const data = await response.json();

			if (!response.ok) {
				console.error('Error fetching users:', data.error);
				return;
			}

			setUsers(data.users as User[] || []);
		} catch (error) {
			console.error('Error:', error);
		} finally {
			setLoading(false);
		}
	};

	const updateUserRole = async (userId: string, newRole: 'admin' | 'representative') => {
		setUpdatingUser(userId);

		try {
			const response = await fetch('/api/admin/update-role', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ userId, role: newRole }),
			});

			const data = await response.json();

			if (!response.ok) {
				console.error('Error updating user:', data.error);
				return;
			}

			setUsers(users.map(user =>
				user.id === userId
					? {
						...user,
						user_metadata: {
							...user.user_metadata,
							role: newRole
						}
					}
					: user
			));
		} catch (error) {
			console.error('Error:', error);
		} finally {
			setUpdatingUser(null);
		}
	};
	console.log(updateUserRole)
	const getInitials = (email?: string, name?: string): string => {
		if (name) {
			return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
		}
		return email ? email.slice(0, 2).toUpperCase() : 'U';
	};

	const getUserDisplayName = (user: User): string => {
		return user.user_metadata?.full_name ||
			user.user_metadata?.name ||
			user.email?.split('@')[0] ||
			'Unknown User';
	};

	const filteredUsers = users.filter(user => {
		const displayName = getUserDisplayName(user).toLowerCase();
		const email = (user.email || '').toLowerCase();
		const phone = (user.phone || '').toLowerCase();
		const search = searchTerm.toLowerCase();

		return displayName.includes(search) ||
			email.includes(search) ||
			phone.includes(search);
	});

	if (loading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
					<div className="space-y-4">
						{[1, 2, 3].map(i => (
							<div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded">
								<div className="w-12 h-12 bg-gray-200 rounded-full"></div>
								<div className="flex-1 space-y-2">
									<div className="h-4 bg-gray-200 rounded w-1/3"></div>
									<div className="h-3 bg-gray-200 rounded w-1/2"></div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-gray-50 min-h-screen">
			<div className="mb-6 flex justify-between">
				<div className="gap-2">
					<h1 className="text-2xl font-semibold text-gray-900 mb-2">Team Users</h1>
					<p className="text-gray-600">Manage and monitor all registered team members</p>
				</div>
				<Link
					href="/team/add"
					className="text-sm flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-700 font-medium h-min rounded-lg hover:bg-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200"
				>
					<UserPlus className="w-4 h-4" />
					Add Team Members
				</Link>
			</div>

			<div className="mb-6">
				<div className="relative max-w-md">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
					<input
						type="text"
						placeholder="Search by name, email or phone number..."
						className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm text-gray-600">
					Showing {filteredUsers.length} of {users.length} users
				</p>
				<div className="flex items-center space-x-2">
					<span className="text-sm text-gray-600">Filter:</span>
					<select className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700">
						<option>All Users</option>
					</select>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-medium text-gray-900">All Users</h2>
				</div>

				<div className="divide-y divide-gray-200">
					{filteredUsers.map((user) => (
						<div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-semibold">
										{getInitials(user.email, getUserDisplayName(user))}
									</div>

									<div className="flex-1">
										<h3 className="text-sm font-medium text-gray-900">
											{getUserDisplayName(user)}
										</h3>
										<p className="text-sm text-gray-500">
											{user.email || 'no email'}
										</p>
										<div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
											<span>{user.phone || 'No phone'}</span>
											<span>Type: {user.user_metadata?.type || 'Standard'}</span>
										</div>
									</div>
								</div>

								<div className="flex items-center space-x-3">
									<div className="flex flex-col items-end">
										<label className="text-xs text-gray-500 mb-1">Role</label>
										{
											user.user_metadata?.role === "super_admin" ?
												<label className="text-sm text-gray-500 mb-1 capitalize ">{user.user_metadata?.role?.replaceAll("_", " ") || "Unset"}</label> :
												<select
													value={user.user_metadata?.role || 'missing'}
													onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'representative')}
													disabled={updatingUser === user.id}
													className="text-sm border border-gray-200 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<option value="representative">Representative</option>
													<option value="admin">Admin</option>
												</select>
										}

										{/**/}
										{updatingUser === user.id && (
											<span className="text-xs text-blue-500 mt-1">Updating...</span>
										)}
									</div>

									<div className="flex flex-col items-end">
										<label className="text-xs text-gray-500 mb-1">Delete</label>
										<button
											onClick={async () => {
												if (!confirm(`Are you sure you want to delete ${getUserDisplayName(user)}?`)) return

												try {
													const res = await fetch('/api/admin/delete-user', {
														method: 'POST',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({ userId: user.id }),
													})
													const data = await res.json()
													if (!res.ok) throw new Error(data.error || 'Failed to delete user')

													setUsers(users.filter(u => u.id !== user.id))
													alert('User deleted successfully');
												} catch (err) {
													console.log(err)
												}
											}}
											className="ml-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
										>
											Delete
										</button>

										{updatingUser === user.id && (
											<span className="text-xs text-blue-500 mt-1">Updating...</span>
										)}
									</div>


									<div className="flex flex-col items-center">
										<span className="text-xs text-gray-500 mb-1">Status</span>
										<span className={`px-2 py-1 rounded-full text-xs font-medium ${
											user.email_confirmed_at
												? 'bg-green-100 text-green-800'
												: 'bg-yellow-100 text-yellow-800'
										}`}>
											{user.email_confirmed_at ? 'Active' : 'Pending'}
										</span>
									</div>

									{/*<div className="flex flex-col items-center">*/}
									{/*	<span className="text-xs text-gray-500 mb-1">Actions</span>*/}
									{/*	<button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">*/}
									{/*		<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
									{/*			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />*/}
									{/*		</svg>*/}
									{/*	</button>*/}
									{/*</div>*/}
								</div>
							</div>

							<div className="mt-3 ml-16 text-xs text-gray-500 space-y-1">
								<div>User ID: {user.id.slice(0, 8)}...</div>
								<div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
								<div>Last Sign In: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</div>
							</div>
						</div>
					))}
				</div>

				{filteredUsers.length === 0 && (
					<div className="px-6 py-8 text-center">
						<div className="text-gray-400 mb-2">
							<svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
						<h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
						<p className="text-sm text-gray-500">
							{searchTerm ? 'Try adjusting your search terms' : 'No users have been registered yet'}
						</p>
					</div>
				)}
			</div>

			<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-lg shadow p-4">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-gray-500">Total Users</p>
							<p className="text-2xl font-bold text-gray-900">{users.length}</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-4">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-gray-500">Active Users</p>
							<p className="text-2xl font-bold text-gray-900">
								{users.filter(user => user.email_confirmed_at).length}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-4">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-gray-500">Admins</p>
							<p className="text-2xl font-bold text-gray-900">
								{users.filter(user => user.user_metadata?.role === 'admin').length}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}