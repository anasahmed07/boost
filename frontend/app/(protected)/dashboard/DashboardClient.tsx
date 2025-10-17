"use client";

import {StatMetric} from "@/types/dashboard";
import {AlertCircle, MessageSquare, Users} from "lucide-react";
import {ChatDataPreview, ChatsData} from "@/types/chat";
import {DashboardWorkspaceNamedBlock, PageHeading} from "@/components/ui/Structure";
import {DashboardChatPreview, DashboardMetricCards2} from "@/components/ui/Cards";
import {useEffect, useState} from "react";
import {AnalyticsOverview} from "@/types/responses";
import {UserData} from "@/types/user";
import Toast from "@/components/ui/Toast";
import PageLoader from "@/components/ui/PageLoader";

// interface ChatPreview {
// 	customers: UserData[];
// }

export default function DashboardClient() {


	const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
	const [analyticsLoading, setAnalyticsLoading] = useState(true);
	const [analyticsError, setAnalyticsError] = useState(false);

	const [chatPreview, setChatPreview] = useState<{ customers: ChatsData[] }>({ customers: [] });
	const [chatLoading, setChatLoading] = useState(true);
	const [chatPreviewError, setChatPreviewError] = useState(false);

	const [showToast, setShowToast] = useState(false);

	const loading = analyticsLoading || chatLoading;
	const error = chatPreviewError || analyticsError;


	// Fetch analytics data
	useEffect(() => {
		async function fetchAnalyticsOverview() {
			try {
				const res = await fetch('/api/analytics/overview', {
					method: 'GET',
					headers: {
						'Accept': 'application/json',
					},
				});

				if (!res.ok) {
					setAnalyticsError(true);
					throw new Error(`Error fetching analytics: ${res.status}`);
				}

				const data = await res.json();
				setAnalytics(data);
			} catch (err) {
				setAnalyticsError(true);
				console.error('Fetch error:', err);
				throw err;
			} finally {
				setAnalyticsLoading(false)
			}
		}
		fetchAnalyticsOverview()
	}, []);

	// Fetch chat preview data
	useEffect(() => {
		async function fetchCustomers() {
			try {
				const res = await fetch('/api/chats?limit=5', {
					method: 'GET',
					headers: {
						'Accept': 'application/json',
					},
				});
				if (!res.ok) {
					throw new Error(`Error: ${res.status}`);
				}
				const data: { customers: ChatsData[] } = await res.json();
				setChatPreview(data);
			} catch (err) {
				console.error('Error fetching customers:', err);
				setChatPreviewError(true);
			} finally {
				setChatLoading(false);
			}
		}
		fetchCustomers();
	}, []);

	useEffect(() => {
		if (error && !loading) {
			setShowToast(true);
		}
	}, [error, loading]);



	// Show loading state only for analytics (main content)
	if (loading) {
		return <PageLoader text={"Loading Dashboard..."}/>
	}


	const metrics: StatMetric[] = [
		{
			name: "Total Customers",
			percentage: "12.5",
			icon: Users,
			isDecline: false,
			number: analytics?.customer_stats?.total_customers || 0,
			iconColor: "blue"
		},
		{
			name: "Total Conversations",
			percentage: "8.2",
			icon: MessageSquare,
			isDecline: false,
			number: analytics?.message_stats?.total_conversations || 0,
			iconColor: "green"
		},
		{
			name: "D2C Customers",
			percentage: "15.7",
			icon: Users,
			isDecline: false,
			number: analytics?.customer_stats?.d2c_customers || 0,
			iconColor: "purple"
		},
		{
			name: "Escalated Chats",
			percentage: "2.1",
			icon: AlertCircle,
			isDecline: true,
			number: analytics?.customer_stats?.escalated_customers || 0,
			iconColor: "red"
		}
	];

	return (
		<main className="flex min-h-screen flex-col p-8 gap-8 w-full">
			<PageHeading
				title={"Dashboard"}
				description={"Welcome back! Here's what's happening with your AI assistant today."}
			/>

			<div className="grid gap-8 grid-cols-2 w-full lg:grid-cols-4">
				{metrics.map((metric: StatMetric, i: number) => (
					<DashboardMetricCards2 metric={metric} key={i}/>
				))}
			</div>

			<div className="flex flex-col xl:grid grid-cols-5 gap-8">
				<DashboardWorkspaceNamedBlock
					heading={"Recent Activity"}
					description={"Latest customer interactions and messages"}
					extraClasses={"col-span-3"}
				>
					{chatLoading ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-gray-500">Loading recent activity...</p>
						</div>
					) : chatPreview?.customers?.length > 0 ? (
						chatPreview.customers.slice(0, 5).map((userData: UserData, i: number) => {
							// Transform UserData to ChatDataPreview format
							const chatData: ChatDataPreview = {
								name: userData.customer_name || 'Unknown Customer',
								phoneNumber: userData.phone_number || 'N/A',
								recentMessage: 'Recent conversation', // You may want to fetch actual recent messages
								timeAgo: 'Recently', // You may want to calculate actual time
								messageType: 'text' // Default message type
							};
							return <DashboardChatPreview chatData={chatData} key={i}/>;
						})
					) : (
						<div className="flex items-center justify-center py-8">
							<p className="text-gray-500">No recent activity found</p>
						</div>
					)}
				</DashboardWorkspaceNamedBlock>

				<DashboardWorkspaceNamedBlock
					heading={"System Status"}
					description={"Real-time service monitoring"}
					extraClasses={"col-span-2 h-full"}
				>
				<iframe
					src={process.env.NEXT_PUBLIC_STATUS_PAGE_URL}
					title="Boost Buddy Status"
					className="w-full h-full border-0"
					style={{ minHeight: '600px'}}
				/>
				</DashboardWorkspaceNamedBlock>
			</div>

			{(error && showToast) && (
				<Toast
					type={"error"}
					message="Oops, we ran into a problem. Refresh page & if the issue persists, contact the developer."
					onClose={() => setShowToast(false)}
				/>
			)}
		</main>
	);
}