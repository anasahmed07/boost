"use client";

import React from "react";
import { Bell } from "lucide-react";

export default function NotificationSettingsTab() {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-6">
			<div className="flex items-center gap-3 mb-4">
				<div className="p-2 bg-purple-100 rounded-lg">
					<Bell className="w-5 h-5 text-purple-600" />
				</div>
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
					<p className="text-sm text-gray-600">Configure your notification preferences</p>
				</div>
			</div>

			<div className="space-y-4">
				<div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
					<h3 className="text-base font-medium text-gray-900 mb-2">Coming Soon</h3>
					<p className="text-gray-600">
						Notification preferences and settings will be available here in a future update.
					</p>
				</div>
			</div>
		</div>
	);
}