'use client';

import React, {useEffect, useState} from 'react';
import { KPICard } from '@/components/analytics/KPICard';
import { PercentageList } from '@/components/analytics/PercentageList';
import {CustomerAnalytics, EscalationAnalytics, MessageAnalytics} from "@/types/responses";
import {
	AlertTriangle, Banknote,
	BarChart2,
	Briefcase,
	Crown,
	MessageCircle,
	MessageSquare,
	ShoppingCart, TrendingUp,
	Users, Wallet, Image as ImageIcon, Mic,
} from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";


export default function AnalyticsPage() {

	const [messageAnalytics, setMessageAnalytics] = useState<MessageAnalytics | null>(null);
	const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
	const [escalationAnalytics, setEscalationAnalytics] = useState<EscalationAnalytics | null>(null);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchMessageAnalytics()
			.then(data => setMessageAnalytics(data))
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));

		fetchCustomerAnalytics()
			.then(data => setCustomerAnalytics(data))
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));

		fetchEscalationAnalytics()
			.then(data => setEscalationAnalytics(data))
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	async function fetchMessageAnalytics() {
		try {
			const res = await fetch('/api/analytics/messages', {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			});

			if (!res.ok) {
				throw new Error(`Error fetching analytics: ${res.status}`);
			}

			const data = await res.json();
			return data; // Your analytics data here
		} catch (err) {
			console.error('Fetch error:', err);
			throw err;
		}
	}

	async function fetchCustomerAnalytics() {
		try {
			const res = await fetch('/api/analytics/customers', {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			});

			if (!res.ok) {
				throw new Error(`Error fetching analytics: ${res.status}`);
			}

			const data = await res.json();
			return data; // Your analytics data here
		} catch (err) {
			console.error('Fetch error:', err);
			throw err;
		}
	};

	async function fetchEscalationAnalytics() {
		try {
			const res = await fetch('/api/analytics/escalations', {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			});

			if (!res.ok) {
				throw new Error(`Error fetching analytics: ${res.status}`);
			}

			const data = await res.json();
			return data; // Your analytics data here
		} catch (err) {
			console.error('Fetch error:', err);
			throw err;
		}
	}


	if (loading) return <PageLoader text={"Loading Analytics..."}/>;
	if (error) return <p>Error: {error}</p>;


	const messageKpis = [
		{
			title: "Total Messages",
			value: messageAnalytics?.total_messages,
			change: "+12.5%",
			isPositive: true,
			icon: <MessageCircle />, // all messages
		},
		{
			title: "Total Conversations",
			value: messageAnalytics?.total_conversations,
			change: "+2.1%",
			isPositive: true,
			icon: <MessageSquare />, // distinct threads
		},
		{
			title: "Avg. Messages per Conversation",
			value: messageAnalytics?.avg_messages_per_conversation,
			change: "+15.7%",
			isPositive: true,
			icon: <BarChart2 />, // fits "average / analytics"
		},
		{
			title: "Escalated Users",
			value: customerAnalytics?.escalated,
			change: "+15.7%",
			isPositive: false,
			icon: <AlertTriangle />, // clearer than AlertCircle for escalation
		},
	];

	const messageDistributionKpis = [
		{
			title: "Text Messages",
			value: messageAnalytics?.message_types?.text,
			change: "+12.5%",
			isPositive: true,
			icon: <MessageCircle />, // 📝 text
		},
		{
			title: "Image Messages",
			value: messageAnalytics?.message_types?.image,
			change: "+2.1%",
			isPositive: true,
			icon: <ImageIcon />, // 🖼️ images/photos
		},
		{
			title: "Audio Messages",
			value: messageAnalytics?.message_types?.audio,
			change: "+15.7%",
			isPositive: true,
			icon: <Mic />, // 🎤 audio/voice
		},
	];


	const customerKpis = [
		{
			title: "Total Users",
			value: customerAnalytics?.total,
			change: "+12.5%",
			isPositive: true,
			icon: <Users />, // 👤👥
		},
		{
			title: "B2B Customers",
			value: customerAnalytics?.by_type.B2B,
			change: "+15.7%",
			isPositive: true,
			icon: <Briefcase />, // business
		},
		{
			title: "D2C Customers",
			value: customerAnalytics?.by_type.D2C,
			change: "+15.7%",
			isPositive: true,
			icon: <ShoppingCart />, // consumers
		},
		{
			title: "Total Spend",
			value: `Rs ${customerAnalytics?.spend_analysis?.total_spend?.toLocaleString()}/-`,
			change: "+2.1%",
			isPositive: true,
			icon: <Banknote />, // 💵 overall spend
		},
		{
			title: "Average Spend",
			value: `Rs ${Math.floor(customerAnalytics?.spend_analysis?.avg_spend ?? 0).toLocaleString()}/-`,
			change: "+2.1%",
			isPositive: true,
			icon: <Wallet />, // 🪪 per-customer
		},
		{
			title: "High Value Customers",
			value: customerAnalytics?.spend_analysis?.high_value_customers,
			change: "+2.1%",
			isPositive: true,
			icon: <Crown />, // 👑 VIPs
		},
		{
			title: "Escalation Rate",
			value: Math.floor(escalationAnalytics?.escalation_rate ?? 0),
			change: "+2.1%",
			isPositive: false,
			icon: <TrendingUp />, // 📈 works as "rate/ratio"
		},
	];




	// Chart Data
	// const messageVolumeData = [
	// 	{ label: 'Mon', value: 1200 },
	// 	{ label: 'Tue', value: 1800 },
	// 	{ label: 'Wed', value: 2200 },
	// 	{ label: 'Thu', value: 1900 },
	// 	{ label: 'Fri', value: 2400 },
	// 	{ label: 'Sat', value: 1600 },
	// 	{ label: 'Sun', value: 1100 }
	// ];
	//
	// const userActivityData = [
	// 	{ label: 'Mon', value: 1500 },
	// 	{ label: 'Tue', value: 1800 },
	// 	{ label: 'Wed', value: 1600 },
	// 	{ label: 'Thu', value: 2000 },
	// 	{ label: 'Fri', value: 1900 },
	// 	{ label: 'Sat', value: 1400 },
	// 	{ label: 'Sun', value: 1200 }
	// ];


	// Message Types Data
	const messageTypesData = [
		{
			label: "Text Messages",
			percentage: `${
				messageAnalytics && messageAnalytics.total_messages
					? ((messageAnalytics.message_types.text / messageAnalytics.total_messages) * 100).toFixed(2)
					: "N/A"
			}%`,
		},
		{
			label: "Image Messages",
			percentage: `${
				messageAnalytics && messageAnalytics.total_messages
					? ((messageAnalytics.message_types.image / messageAnalytics.total_messages) * 100).toFixed(2)
					: "N/A"
			}%`,
		},
		{
			label: "Audio Messages",
			percentage: `${
				messageAnalytics && messageAnalytics.total_messages
					? ((messageAnalytics.message_types.audio / messageAnalytics.total_messages) * 100).toFixed(2)
					: "N/A"
			}%`,
		},
		{
			label: "Audio Messages",
			percentage: `${
				messageAnalytics && messageAnalytics.total_messages
					? ((messageAnalytics.message_types.audio / messageAnalytics.total_messages) * 100).toFixed(2)
					: "N/A"
			}%`,
		},
	];

	// Top Interactions Data
	const topInteractionsData = [
		{ label: "Account Help", percentage: "32%" },
		{ label: "Product Info", percentage: "28%" },
		{ label: "Technical Support", percentage: "22%" },
		{ label: "General Inquiry", percentage: "18%" }
	];

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
					<p className="text-gray-600 mt-2">Monitor performance and user engagement metrics</p>
				</div>

				{/* Messages KPI Cards */}
				<div className="text-gray-900 mt-4 mb-2 font-bold text-lg">Message Stats</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{messageKpis.map((kpi, index) => (
						<KPICard
							key={index}
							title={kpi.title}
							value={kpi.value ?? 0}
							change={kpi.change}
							isPositive={kpi.isPositive}
							icon={kpi.icon}
						/>
					))}
				</div>

				{/* Message Distro KPI Cards */}
				<div className="text-gray-900 mt-4 mb-2 font-bold text-lg">Messages Distribution Stats</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{messageDistributionKpis.map((kpi, index) => (
						<KPICard
							key={index}
							title={kpi.title}
							value={kpi.value ?? 0}
							change={kpi.change}
							isPositive={kpi.isPositive}
							icon={kpi.icon}
						/>
					))}
				</div>

				{/* Custoemrs KPI Cards */}
				<div className="text-gray-900 mt-4 mb-2 font-bold text-lg">Customer Stats</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{customerKpis.map((kpi, index) => (
						<KPICard
							key={index}
							title={kpi.title}
							value={kpi.value ?? 0}
							change={kpi.change}
							isPositive={kpi.isPositive}
							icon={kpi.icon}
						/>
					))}
				</div>


				{/* Bottom Row */}
				<div className="text-gray-900 mt-4 mb-2 font-bold text-lg">Other Metrics</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<PercentageList
						title="Message Types"
						subtitle="Distribution of message types"
						data={messageTypesData}
					/>
					<PercentageList
						title="* Top Interactions"
						subtitle="Most common user queries. These analytics are currently being collected and refined."
						data={topInteractionsData}
					/>
				</div>
			</div>
		</div>
	);
}