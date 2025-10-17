"use client";

import {PageHeading} from "@/components/ui/Structure";
import React, { useState } from "react";
import BotSettingsTab from "./_components/BotSettingsTab";
import AccountSettingsTab from "./_components/AccountSettingsTab";
import NotificationSettingsTab from "./_components/NotificationSettingsTab";

export default function SettingsClient() {
	const [activeTab, setActiveTab] = useState("bot");

	const tabs = [
		{ id: "bot", label: "Bot", component: BotSettingsTab },
		{ id: "account", label: "Account", component: AccountSettingsTab },
		{ id: "notifications", label: "Notifications", component: NotificationSettingsTab },
	];

	const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || BotSettingsTab;

	return (
		<div className="p-8 flex flex-col gap-6 h-full">
			<PageHeading
				title="Settings"
				description="Change Settings"
			/>

			{/* Tab Navigation */}
			<div className="border-b border-gray-200">
				<nav className="flex space-x-8">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
								activeTab === tab.id
									? "border-yellow-500 text-yellow-600"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="flex-1">
				<ActiveComponent />
			</div>
		</div>
	)
}