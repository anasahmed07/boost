import {
	AlertCircle,
	Clock,
	EllipsisVertical, ExternalLink,
	Image as ImageIcon,
	MessageCircle,
	Mic,
	Phone,
	Trash2
} from "lucide-react";
// import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

import { ChatMessage } from "@/types/chat";
import { ExtendedUserData } from "@/types/user";
import Link from "next/link";

interface ChatPreviewProps {
	chatData: ExtendedUserData;
	disabled: boolean;
	latestMessage?: ChatMessage | null;
	lastMessageLoading?: boolean;
	isSelected: boolean;
	onChatDeleted?: (phoneNumber: string) => void; // Callback for when chat is deleted
	onSelected: (phone: string) => void;
}

export default function ChatPreview({ chatData, disabled, latestMessage, lastMessageLoading, isSelected, onChatDeleted, onSelected }: ChatPreviewProps) {
	const [showDropdown, setShowDropdown] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const initials = chatData.customer_name
		? chatData.customer_name.split(" ").map(word => word[0]).join("").slice(0, 2)
		: "?";

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

	// Handle delete chat
	const handleDeleteChat = async (e: React.MouseEvent) => {
		e.preventDefault(); // Prevent navigation
		e.stopPropagation();

		const confirmDelete = confirm(
			`Are you sure you want to delete the chat history for ${chatData.customer_name || chatData.phone_number}?\n\nThis action cannot be undone.`
		);

		if (!confirmDelete) {
			setShowDropdown(false);
			return;
		}

		setIsDeleting(true);
		try {
			const response = await fetch(`/api/chats/${chatData.phone_number}/delete`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error('Failed to delete chat history');
			}

			// Call the callback to notify parent component
			if (onChatDeleted) {
				onChatDeleted(chatData.phone_number);
			}
		} catch (error) {
			console.error('Error deleting chat:', error);
			alert('Failed to delete chat history. Please try again.');
		} finally {
			setIsDeleting(false);
			setShowDropdown(false);
		}
	};

	// Handle dropdown toggle
	const handleDropdownToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setShowDropdown(!showDropdown);
	};

	// Format the timestamp to a readable format
	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
		const diffInHours = Math.floor(diffInMinutes / 60);
		const diffInDays = Math.floor(diffInHours / 24);

		if (diffInMinutes < 1) {
			return "Just now";
		} else if (diffInMinutes < 60) {
			return `${diffInMinutes}m`;
		} else if (diffInHours < 24) {
			return `${diffInHours}h`;
		} else if (diffInDays < 7) {
			return `${diffInDays}d`;
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	};

	// Get message type icon with styling
	const getMessageTypeIcon = (messageType: string) => {
		const iconClass = "w-3.5 h-3.5";
		switch (messageType) {
			case 'audio':
				return <Mic className={`${iconClass} text-purple-500`} />;
			case 'image':
				return <ImageIcon className={`${iconClass} text-blue-500`} />;
			case 'text':
			default:
				return <MessageCircle className={`${iconClass} text-gray-500`} />;
		}
	};

	// Truncate message content
	const truncateMessage = (content: string, maxLength: number = 60) => {
		if (!content) return "";
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength) + "...";
	};

	// Get message preview text based on type
	const getMessagePreview = (message: ChatMessage) => {
		switch (message.message_type) {
			case 'audio':
				return "Voice message";
			case 'image':
				return "Photo";
			case 'text':
			default:
				return truncateMessage(message.content);
		}
	};

	// Get sender badge styling
	const getSenderStyle = (sender: string) => {
		const role = sender.toLowerCase();

		if (role.includes("customer") || role.includes("user")) {
			return "bg-blue-100 text-blue-700 border-blue-200";
		} else if (role.includes("representative")) {
			return "bg-yellow-100 text-yellow-700 border-yellow-200";
		} else if (role.includes("agent")) {
			return "bg-green-100 text-green-700 border-green-200";
		}

		// default/fallback
		return "bg-gray-100 text-gray-700 border-gray-200";
	};

	const isEscalated = chatData.escalation_status;
	const hasRecentMessage = latestMessage && !lastMessageLoading;
	const isRecent = hasRecentMessage && (new Date().getTime() - new Date(latestMessage.time_stamp).getTime()) < 3600000; // 1 hour

	return (
		<div
			className={`group relative transition-all duration-200 rounded-xl cursor-pointer ${
				disabled ? "opacity-60" : "hover:shadow-md"
			}`}
			onClick={() => {
				if (!disabled) return onSelected(chatData.phone_number)
			}}
		>
			<div
				// href={`/inbox/${chatData.phone_number}`}
				className={`block ${disabled ? "pointer-events-none" : ""}`}
			>
				<div
					className={`relative p-2 rounded-xl border-2 transition-all duration-200
					${disabled
						? "bg-gray-50 border-gray-200"
						: isSelected
							? isEscalated
								? "bg-gradient-to-r from-red-100 to-yellow-50 border-red-400 shadow-lg shadow-red-100"
								: "bg-yellow-50 border-yellow-400 shadow-lg shadow-yellow-100"
							: isEscalated
								? "bg-red-100 border-red-200 hover:border-red-300 hover:shadow-red-100/50"

								: "bg-white border-gray-200 hover:border-gray-300 group-hover:bg-gray-50/50"
					}`}
				>


				{/* Escalation indicator */}
					{isEscalated && (
						<div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
					)}

					{/* Recent activity indicator */}
					{isRecent && !isEscalated && (
						<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
					)}

					{/* Dropdown Menu */}
					{!disabled && (
						<div className="absolute top-3 right-3 z-10" ref={dropdownRef}>
							<button
								onClick={handleDropdownToggle}
								className="flex items-center justify-center w-8 h-8 text-gray-900 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200 opacity-70 group-hover:opacity-100"
							>
								<EllipsisVertical className="w-4 h-4" />
							</button>

							{showDropdown && (
								<div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48 z-20">
									<Link
										href={`/inbox/${chatData.phone_number}`}
										className="w-full px-4 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
									>
										<ExternalLink className="w-4 h-4" />
										Open chat in full window
									</Link>
									<button
										onClick={handleDeleteChat}
										disabled={isDeleting}
										className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
									>
										<Trash2 className="w-4 h-4" />
										{isDeleting ? 'Deleting...' : 'Delete chat history'}
									</button>
								</div>
							)}
						</div>
					)}

					<div className="flex items-start gap-4">
						{/* Enhanced Avatar */}
						<div className="relative flex-shrink-0">
							<div className={`flex items-center justify-center rounded-full text-white font-bold shadow-lg transition-all duration-200 w-6 h-6 text-xs ${
								disabled
									? "bg-gray-400"
									: chatData.phone_number === "923092328094"
									// IF YOU ARE SEEING THIS PLEASE IGNORE IT 🥺
									? "bg-gradient-to-br from-rose-500 to-yellow-500 group-hover:shadow-xl group-hover:scale-105 relative after:content-['.'] after:absolute after:-top-3 after:right-[-0px] after:text-xs"
									: isEscalated
									? "bg-gradient-to-br from-red-400 to-red-600"
									: "bg-gradient-to-br from-blue-500 to-purple-600 group-hover:shadow-xl group-hover:scale-105"
								}`}>
								{initials.toUpperCase()}
							</div>

							{/* Online status indicator (if recent) */}
							{isRecent && (
								<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
							)}
						</div>

						{/* Main Content Area */}
						<div className="flex-1 min-w-0 space-y-2">
							{/* Header Row */}
							<div className="flex items-center justify-between gap-3 pr-10">
								<h3 className="font-semibold text-gray-900 truncate text-lg leading-tight">
									{chatData.customer_name || `+${chatData.phone_number}`}
								</h3>

								{/* Timestamp */}
								{hasRecentMessage && (
									<div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
										isRecent
											? "bg-green-100 text-green-700 border border-green-200"
											: "bg-gray-100 text-gray-600"
									}`}>
										<Clock className="w-3 h-3" />
										{formatTimestamp(latestMessage.time_stamp)}
									</div>
								)}

								{lastMessageLoading && (
									<div className="flex items-center gap-1.5 text-xs text-gray-400 px-2 py-1 rounded-full bg-gray-50">
										<div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
										<span>Loading</span>
									</div>
								)}
							</div>

							{/* Contact Info Row */}
							<div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
								<Phone className="w-4 h-4 text-gray-400" />
								<span className="font-mono">{chatData.phone_number}</span>

								{/* Customer Type Badge */}
								{chatData.customer_type && (
									<span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full uppercase tracking-wide">
                                        {chatData.customer_type}
                                    </span>
								)}

								{/* Tags Display */}
								{chatData.tags && chatData.tags.length > 0 && (
									<>
										{chatData.tags.map((tag, index) => (
											<span
												key={index}
												className={`capitalize px-2 py-0.5 ${tag.toLowerCase() === "developer" ? "bg-amber-100 shadow-inner shadow-inner-amber-500 text-amber-500 shadow-md shadow-amber-400 " : "bg-blue-100 text-blue-700"} text-xs font-medium rounded-full`}
											>
                                                {tag === "developer" ? "developer" : tag}
                                            </span>
										))}
									</>
								)}
							</div>

							{/* Latest Message Row */}
							{hasRecentMessage ? (
								<div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
									<div className="flex-shrink-0 mt-0.5">
										{getMessageTypeIcon(latestMessage.message_type)}
									</div>

									<div className="flex-1 min-w-0 space-y-1">
										{/* Sender Badge */}
										<div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSenderStyle(latestMessage.sender)}`}>
											{latestMessage.sender}
										</div>

										{/* Message Content */}
										<p className="text-sm text-gray-700 leading-relaxed">
											{getMessagePreview(latestMessage)}
										</p>
									</div>
								</div>
							) : lastMessageLoading ? (
								<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 animate-pulse">
									<div className="w-5 h-5 bg-gray-200 rounded-full"></div>
									<div className="flex-1 space-y-2">
										<div className="h-3 bg-gray-200 rounded w-1/4"></div>
										<div className="h-4 bg-gray-200 rounded w-3/4"></div>
									</div>
								</div>
							) : chatData.status === 'customer_only' ? (
								<div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
									<AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
									<span className="text-sm text-amber-800 font-medium">No chat history available</span>
								</div>
							) : null}

							{/* Status Footer */}
							<div className="flex items-center justify-between pt-1">
								<div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${
									isEscalated
										? "bg-red-100 text-red-800 border border-red-200"
										: "bg-green-100 text-green-800 border border-green-200"
								}`}>
									{isEscalated ? (
										<>
											<AlertCircle className="w-3 h-3" />
											Escalated
										</>
									) : (
										<>
											<div className="w-2 h-2 bg-green-500 rounded-full"></div>
											Normal
										</>
									)}
								</div>

								{/* Total Spend */}
								{chatData.total_spend && chatData.total_spend > 0 && (
									<span className="text-xs text-gray-600 font-medium">
                                        Spend: Rs {chatData.total_spend.toLocaleString()}/-
                                    </span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
