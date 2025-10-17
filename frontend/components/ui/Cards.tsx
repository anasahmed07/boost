import {StatMetric} from "@/types/dashboard";
import { MessageSquare, Phone, TrendingDown, TrendingUp, EllipsisVertical, Trash2} from "lucide-react";
import {clsx} from "clsx";
import {ServiceStatus, ServiceStatuses} from "@/types/service";
import {ChatDataPreview} from "@/types/chat";
import React, {useEffect, useRef, useState } from "react";
import {UserData, UserMetric} from "@/types/user";

export const DashboardMetricCards = ({metric}: {metric:StatMetric}) => {
	const iconBgClass = {
		blue: "bg-blue-100 text-blue-500",
		green: "bg-green-100 text-green-500",
		red: "bg-red-100 text-red-500",
		yellow: "bg-yellow-100 text-yellow-500",
		purple: "bg-purple-100 text-purple-500",
		orange: "bg-orange-100 text-orange-500"
		// Add more if needed
	}[metric.iconColor] || "bg-gray-100 text-gray-500"; // fallback
	return (
		<div className="flex shadow-sm rounded-md flex-col p-6 gap-6">
			<div className="flex justify-between items-center">
				<div className="flex uppercase text-neutral-500 font-bold">{metric.name}</div>
				<div className={clsx("p-3 rounded-md", iconBgClass)}>
					<metric.icon size={16}/>
				</div>
			</div>
			<div className="text-black text-3xl font-bold">{formatNumberWithCommas(metric.number ?? 0)}</div>
			<div className="flex font-semibold items-center gap-1">
				<div className={`${metric.isDecline ? "text-red-500" : "text-green-500"} flex items-center gap-1`}>
					{metric.isDecline ? <TrendingDown size={15}/> : <TrendingUp size={15}/>} +{metric.percentage}%
				</div>
				<div className="text-neutral-500">vs last month</div>
			</div>
		</div>
	)
}

export const DashboardMetricCards2 = ({metric}: {metric:StatMetric}) => {
	const iconBgClass = {
		blue: "bg-blue-100 text-blue-500",
		green: "bg-green-100 text-green-500",
		red: "bg-red-100 text-red-500",
		yellow: "bg-yellow-100 text-yellow-500",
		purple: "bg-purple-100 text-purple-500",
		orange: "bg-orange-100 text-orange-500"
		// Add more if needed
	}[metric.iconColor] || "bg-gray-100 text-gray-500"; // fallback
	return (
		<div className="flex shadow-sm rounded-md flex-col p-6 gap-6">
			<div className="flex justify-between items-center">
				<div className="flex uppercase text-neutral-500 font-bold">{metric.name}</div>
				<div className={clsx("p-3 rounded-md", iconBgClass)}>
					<metric.icon size={16}/>
				</div>
			</div>
			<div className="text-black text-3xl font-bold">{formatNumberWithCommas(metric.number ?? 0)}</div>

		</div>
	)
}

export const DashboardChatPreview = ({chatData}: {chatData: ChatDataPreview}) => {
	const initials = chatData.name
		? chatData.name.split(" ").map(word => word[0]).join("").slice(0, 2)
		: "?";
	return (
		<div className="flex flex-row gap-4 w-full bg-neutral-50 p-4 rounded-lg">
			
			<div className="flex items-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-xl text-white text-sm font-bold w-12 h-12 ">{initials}</div>
			
			<div className="flex justify-between w-full">
				<div className="flex flex-col gap-2">
					<div className="text-neutral-900 capitalize font-bold text-lg">{chatData.name}</div>
					<div className="text-xs text-neutral-500">{chatData.phoneNumber}</div>
					<div className="">{chatData.recentMessage}</div>
					{/*<div className="text-xs text-neutral-400">{chatData.timeAgo}</div>*/}
				</div>
				<div className="flex">
					<div className="text-xs font-semibold rounded-full p-1 border border-blue-500 bg-blue-100 text-blue-700 max-h-max">{chatData.messageType}</div>
				</div>
			</div>
			
		</div>
	)
}

export const UserMetricsCard = ({userMetric}: {userMetric: UserMetric}) => {

	const iconBackground = {
		red: "bg-red-200 text-red-500",
		yellow: "bg-yellow-200 text-yellow-500",
		green: "bg-green-200 text-green-500",
	}[userMetric.color || ""] || "bg-gray-200 text-gray-500";

	const dotBackground = {
		red: "bg-red-500",
		yellow: "bg-yellow-500",
		green: "bg-green-500",
	}[userMetric.color || ""] || "bg-gray-200";



	return (
		<div className="flex shadow-md rounded-lg px-4 py-10 gap-6 items-center">
			<div className={`flex ${iconBackground} rounded-lg items-center justify-center w-10 h-10 `}>
				{
					userMetric.icon ? <userMetric.icon size={16} /> : <div className={`w-4 h-4 ${dotBackground} rounded-full leading-none items-center justify-center flex`}></div>
				}
			</div>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col font-semibold text-sm text-neutral-500">{userMetric.name}</div>
				<div className="flex flex-col text-3xl font-bold">{userMetric.number}</div>
			</div>
		</div>
	)
}

export const DashboardStatusCard = ({serviceStatus}: {serviceStatus: ServiceStatus}) => {
	const statusStyles: Record<ServiceStatuses, {
		dotColor: string;
		tagClasses: string;
	}> = {
		[ServiceStatuses.Operational]: {
			dotColor: "bg-green-500 shadow-green-400",
			tagClasses: "bg-green-100 text-green-700 border border-green-500"
		},
		[ServiceStatuses.Degraded]: {
			dotColor: "bg-yellow-500 shadow-yellow-400",
			tagClasses: "bg-yellow-100 text-yellow-700 border border-yellow-500"
		},
		[ServiceStatuses.Down]: {
			dotColor: "bg-red-500 shadow-red-400",
			tagClasses: "bg-red-100 text-red-700 border border-red-500"
		}
	};

	const { dotColor, tagClasses } = statusStyles[serviceStatus.status];

	return (
		<div className="flex w-full gap-4 p-4 bg-neutral-50 rounded-lg">
			<div className="p-2 flex justify-center items-center max-w-max">
				<div className={`w-3 h-3 rounded-full ${dotColor} shadow-md shadow-`} />
			</div>
			<div className="flex flex-col flex-1 gap-2">
				<div className="text-neutral-900 font-semibold">{serviceStatus.name}</div>
				<div className="text-neutral-500 text-sm">Uptime: {serviceStatus.uptime}%</div>
			</div>
			<div className={`flex items-center h-min text-xs p-1 rounded-full font-semibold ${tagClasses}`}>
				{serviceStatus.status}
			</div>
		</div>
	)
}

function formatNumberWithCommas(number: number): string {
	return number.toLocaleString("en-US");
}




export const UserCard = ({ userData, onUserDeleted }: { userData: UserData, onUserDeleted?: () => void }) => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	// const router = useRouter();
	const initials = userData.customer_name
		? userData.customer_name.split(" ").map(word => word[0]).join("").slice(0, 2)
		: `?`;

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleDeleteUser = async () => {
		if (!confirm(`Are you sure you want to delete ${userData.customer_name || userData.phone_number}?`)) return;

		setIsDeleting(true);
		try {
			const response = await fetch(`/api/customers/${userData.phone_number}/delete`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete user');

			alert('User deleted successfully');
			setShowDropdown(false);

			if (onUserDeleted) onUserDeleted(); // trigger parent refresh
		} catch (err) {
			console.error(err);
			alert('Failed to delete user');
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="flex p-2 items-start gap-4 border border-neutral-300 rounded-lg">
			<div className="flex flex-1 gap-4 p-2">
				<div className="flex items-center self-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full text-white text-sm font-bold w-12 h-12">{initials}</div>
				<div className="flex flex-col gap-3 flex-1">
					<div className="capitalize font-semibold">{userData.customer_name || `+${userData.phone_number}`}</div>
					<div className="leading-none text-sm text-neutral-500">{userData.email || "no email"}</div>
					<div className="leading-none text-sm text-neutral-500 flex gap-1"><Phone size={12}/> {userData.phone_number}</div>
					<div className="leading-none text-sm text-neutral-500 flex gap-1"><MessageSquare size={12}/>Type: {userData.customer_type}</div>

					{/* Display tags */}
					{userData.tags && userData.tags.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-1">
							{userData.tags.map((tag, idx) => (
								<span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
									{tag}
								</span>
							))}
						</div>
					)}
				</div>
			</div>
			<div className="relative" ref={dropdownRef}>
				<div
					className="flex cursor-pointer hover:shadow-sm duration-100 p-1 rounded-md hover:bg-neutral-100"
					onClick={() => setShowDropdown(!showDropdown)}
				>
					<EllipsisVertical className="flex" size={16}/>
				</div>

				{showDropdown && (
					<div className="absolute right-0 top-8 bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-10 min-w-48">
						<button
							onClick={handleDeleteUser}
							disabled={isDeleting}
							className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Trash2 size={14} />
							{isDeleting ? 'Deleting...' : 'Delete user data & chat history'}
						</button>
					</div>
				)}
			</div>
		</div>
	)
}