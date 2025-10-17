"use client";

import React, { useState, useEffect } from "react";
import { Bot, MessageCircle, Users, Smile, AlertTriangle } from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";

interface PersonaData {
	d2c_customer_support_agent: string;
	b2b_business_support_agent: string;
	customer_greeting_agent: string;
}

interface AgentConfig {
	key: keyof PersonaData;
	name: string;
	description: string;
	icon: React.ReactNode;
	color: string;
}

const agentConfigs: AgentConfig[] = [
	{
		key: "d2c_customer_support_agent",
		name: "D2C Customer Support",
		description: "Handles direct-to-consumer customer queries, orders, and support",
		icon: <MessageCircle className="w-5 h-5" />,
		color: "blue",
	},
	{
		key: "b2b_business_support_agent",
		name: "B2B Business Support",
		description: "Manages business customer invoicing and QuickBooks operations",
		icon: <Users className="w-5 h-5" />,
		color: "green",
	},
	{
		key: "customer_greeting_agent",
		name: "Customer Greeting",
		description: "Provides friendly welcome messages and initial customer interaction",
		icon: <Smile className="w-5 h-5" />,
		color: "purple",
	},
];

export default function BotSettingsTab() {
	const [personas, setPersonas] = useState<PersonaData>({
		d2c_customer_support_agent: "",
		b2b_business_support_agent: "",
		customer_greeting_agent: "",
	});
	const [loading, setLoading] = useState(true);
	const [submittingAgent, setSubmittingAgent] = useState<string | null>(null);
	const [messages, setMessages] = useState<Record<string, string>>({});
	const [showWarning, setShowWarning] = useState<string | null>(null);
	const [pendingSubmit, setPendingSubmit] = useState<{
		agentKey: keyof PersonaData;
		event: React.FormEvent;
	} | null>(null);

	useEffect(() => {
		fetchPersonas();
	}, []);

	const fetchPersonas = async () => {
		try {
			const response = await fetch("/api/persona");
			if (response.ok) {
				const data = await response.json();
				setPersonas(data);
			} else {
				console.error("Failed to fetch personas");
			}
		} catch (error) {
			console.error("Error fetching personas:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (agentKey: keyof PersonaData, e: React.FormEvent) => {
		e.preventDefault();

		// Show warning modal first
		setShowWarning(agentKey);
		setPendingSubmit({ agentKey, event: e });
	};

	const confirmSubmit = async () => {
		if (!pendingSubmit) return;

		const { agentKey } = pendingSubmit;
		setShowWarning(null);
		setPendingSubmit(null);
		setSubmittingAgent(agentKey);
		setMessages({ ...messages, [agentKey]: "" });

		try {
			const response = await fetch("/api/persona", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					agent_name: agentKey,
					new_persona: personas[agentKey],
				}),
			});

			if (response.ok) {
				setMessages({ ...messages, [agentKey]: "Persona updated successfully!" });
			} else {
				setMessages({ ...messages, [agentKey]: "Failed to update persona. Please try again." });
			}
		} catch (error) {
			console.log(error);
			setMessages({ ...messages, [agentKey]: "An error occurred. Please try again." });
		} finally {
			setSubmittingAgent(null);
		}
	};

	const cancelSubmit = () => {
		setShowWarning(null);
		setPendingSubmit(null);
	};

	const handlePersonaChange = (agentKey: keyof PersonaData, value: string) => {
		setPersonas({ ...personas, [agentKey]: value });
		// Clear message when user starts editing
		if (messages[agentKey]) {
			setMessages({ ...messages, [agentKey]: "" });
		}
	};

	const getColorClasses = (color: string) => {
		const colorMap = {
			blue: "bg-blue-100 text-blue-600",
			green: "bg-green-100 text-green-600",
			purple: "bg-purple-100 text-purple-600",
		};
		return colorMap[color as keyof typeof colorMap] || "bg-gray-100 text-gray-600";
	};

	if (loading) {
		return <PageLoader text={"Loading Bot Settings..."}/>
	}

	return (
		<div className="space-y-6">
			{/* Warning Modal */}
			{showWarning && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-mx-4 shadow-xl">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-amber-100 rounded-lg">
								<AlertTriangle className="w-6 h-6 text-amber-600" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900">Warning: Bot Persona Update</h3>
						</div>

						<div className="mb-6">
							<p className="text-gray-700 mb-3">
								You are about to update your bot&#39;s persona. This will immediately affect how your bot interacts with customers.
							</p>
							<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
								<ul className="text-sm text-amber-800 space-y-1">
									<li>• Changes take effect immediately</li>
									<li>• This will impact all future customer conversations</li>
									<li>• Make sure to test the new persona thoroughly</li>
									<li>• Consider the impact on your customer experience</li>
								</ul>
							</div>
						</div>

						<div className="flex gap-3 justify-end">
							<button
								onClick={cancelSubmit}
								className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={confirmSubmit}
								className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
							>
								Update Persona
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="bg-white rounded-xl border border-gray-200 p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-yellow-100 rounded-lg">
						<Bot className="w-5 h-5 text-yellow-600" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-gray-900">Bot Configuration</h2>
						<p className="text-sm text-gray-600">Customize your bot agents&#39; personalities and behavior</p>
					</div>
				</div>

				<div className="space-y-6">
					{agentConfigs.map((config) => (
						<div key={config.key} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
							<div className="flex items-center gap-3 mb-4">
								<div className={`p-2 rounded-lg ${getColorClasses(config.color)}`}>
									{config.icon}
								</div>
								<div>
									<h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
									<p className="text-sm text-gray-600">{config.description}</p>
								</div>
							</div>

							<form onSubmit={(e) => handleSubmit(config.key, e)} className="space-y-4">
								<div>
									<label htmlFor={config.key} className="block text-sm font-medium text-gray-700 mb-2">
										Agent Persona
									</label>
									<textarea
										id={config.key}
										name={config.key}
										value={personas[config.key]}
										onChange={(e) => handlePersonaChange(config.key, e.target.value)}
										rows={8}
										className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-vertical font-mono text-sm"
										placeholder="Describe how you want this agent to behave, its personality, tone, and any specific instructions..."
										required
									/>
								</div>

								<div className="flex items-center gap-4">
									<button
										type="submit"
										disabled={submittingAgent === config.key || !personas[config.key].trim()}
										className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{submittingAgent === config.key ? "Saving..." : "Save Persona"}
									</button>

									{messages[config.key] && (
										<span className={`text-sm ${messages[config.key].includes("success") ? "text-green-600" : "text-red-600"}`}>
                      {messages[config.key]}
                    </span>
									)}
								</div>
							</form>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}