"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Calendar, Shield, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function AccountSettingsTab() {
	const [user, setUser] = useState<SupabaseUser | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = createClient();

	useEffect(() => {
		const getUser = async () => {
			try {
				const { data: { user }, error } = await supabase.auth.getUser();
				if (error) {
					console.error('Error fetching user:', error);
				} else {
					setUser(user);
				}
			} catch (error) {
				console.error('Error:', error);
			} finally {
				setLoading(false);
			}
		};

		getUser();
	}, [supabase]);

	if (loading) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-green-100 rounded-lg">
						<User className="w-5 h-5 text-green-600" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
						<p className="text-sm text-gray-600">Loading your account information...</p>
					</div>
				</div>
				<div className="animate-pulse space-y-4">
					<div className="h-4 bg-gray-200 rounded w-3/4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/2"></div>
					<div className="h-4 bg-gray-200 rounded w-2/3"></div>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-red-100 rounded-lg">
						<User className="w-5 h-5 text-red-600" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
						<p className="text-sm text-gray-600">Unable to load account information</p>
					</div>
				</div>
				<div className="bg-red-50 p-6 rounded-lg border border-red-200">
					<p className="text-red-600">Please try refreshing the page or logging in again.</p>
				</div>
			</div>
		);
	}

	const formatDate = (dateString: string | number | Date | null | undefined) => {
		if (!dateString) return 'Not available';

		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (error) {
			console.log(error)
			return 'Invalid date';
		}
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-6">
			<div className="flex items-center gap-3 mb-4">
				<div className="p-2 bg-green-100 rounded-lg">
					<User className="w-5 h-5 text-green-600" />
				</div>
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
					<p className="text-sm text-gray-600">Manage your account preferences and profile</p>
				</div>
			</div>

			<div className="space-y-4">
				{/* User Profile Information */}
				<div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
					<h3 className="text-base font-medium text-gray-900 mb-4">Profile Information</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<Mail className="w-4 h-4 text-blue-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-700">Email</p>
								<p className="text-sm text-gray-600">{user.email}</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="p-2 bg-purple-100 rounded-lg">
								<Shield className="w-4 h-4 text-purple-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-700">User ID</p>
								<p className="text-sm text-gray-600 font-mono">{user.id}</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="p-2 bg-yellow-100 rounded-lg">
								<Calendar className="w-4 h-4 text-yellow-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-700">Account Created</p>
								<p className="text-sm text-gray-600">{formatDate(user.created_at)}</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-100 rounded-lg">
								<Clock className="w-4 h-4 text-green-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-700">Last Sign In</p>
								<p className="text-sm text-gray-600">{formatDate(user.last_sign_in_at)}</p>
							</div>
						</div>
					</div>
				</div>

				{/* User Metadata */}
				{user.user_metadata && Object.keys(user.user_metadata).length > 0 && (
					<div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
						<h3 className="text-base font-medium text-gray-900 mb-4">Additional Information</h3>
						<div className="space-y-2">
							{Object.entries(user.user_metadata).map(([key, value]) => (
								<div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                                    <span className="text-sm font-medium text-gray-700 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </span>
									<span className="text-sm text-gray-600">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* App Metadata */}
				{user.app_metadata && Object.keys(user.app_metadata).length > 0 && (
					<div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
						<h3 className="text-base font-medium text-gray-900 mb-4">App Metadata</h3>
						<div className="space-y-2">
							{Object.entries(user.app_metadata).map(([key, value]) => (
								<div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                                    <span className="text-sm font-medium text-gray-700 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </span>
									<span className="text-sm text-gray-600">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Email Verification Status */}
				<div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
					<h3 className="text-base font-medium text-gray-900 mb-4">Account Status</h3>
					<div className="flex items-center gap-2">
						<div className={`w-2 h-2 rounded-full ${user.email_confirmed_at ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
						<span className="text-sm text-gray-600">
                            Email {user.email_confirmed_at ? 'Verified' : 'Not Verified'}
                        </span>
						{user.email_confirmed_at && (
							<span className="text-xs text-gray-500 ml-2">
                                on {formatDate(user.email_confirmed_at)}
                            </span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}