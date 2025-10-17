import ChatPreview from "@/components/ui/ChatPreview";
import {AlertCircle, MessageCircle, User} from "lucide-react";

import { CustomerChats } from "@/types/user";
// import {ChatData} from "@/types/chat";

export interface ConversationsListProps {
	conversations: CustomerChats[];
	selectedChat: string;
	onChatDeleted: (phoneNumber: string) => void;
	selectChat: (phone: string) => void;
}

const getStatusInfo = (status: string) => {
	switch (status) {
		case 'active':
			return {
				label: 'Active',
				color: 'bg-green-100 text-green-800 border-green-200',
				icon: <div className="w-2 h-2 bg-green-500 rounded-full" />,
				description: 'Has both chat and customer data'
			};
		case 'chat_only':
			return {
				label: 'Chat Only',
				color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
				icon: <MessageCircle className="w-3 h-3" />,
				description: 'Has chat history but no customer record'
			};
		case 'customer_only':
			return {
				label: 'No Chat',
				color: 'bg-blue-100 text-blue-800 border-blue-200',
				icon: <User className="w-3 h-3" />,
				description: 'Has customer record but no chat history'
			};
		default:
			return {
				label: 'Unknown',
				color: 'bg-gray-100 text-gray-800 border-gray-200',
				icon: <AlertCircle className="w-3 h-3" />,
				description: 'Status unknown'
			};
	}
};

const InboxList = ({ conversations, selectedChat, onChatDeleted, selectChat }: ConversationsListProps) => {
	return (
		<div className="space-y-2">
			{conversations.map((data, i) => {
				const statusInfo = getStatusInfo('active');
				const isDisabled = false;

				return (
					<div
						key={`${data.phone_number || i}`}
						className={`relative ${isDisabled ? 'opacity-75 bg-gray-50 border border-gray-200 rounded-lg p-2' : ''}`}
					>
						 {/*Status Badge for non-active entries*/}
						{isDisabled && (
							data.status && data.status !== 'active' && (
								<div className="absolute top-2 right-2 z-10">
									<div
										className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
										{statusInfo.icon}
										{statusInfo.label}
									</div>
								</div>
							)
						)}

						{/* Show additional info for disabled entries */}
						{isDisabled && (
							<div className="mb-2 text-xs text-gray-600 italic">
								{statusInfo.description}
							</div>
						)}

						{/*time_stamp: string;
	content: string;
	message_type: 'audio' | 'text' | 'image' | string;
	sender: string;*/}

						<ChatPreview
							chatData={data}
							disabled={false}
							latestMessage={{
								content: data.last_message,
								time_stamp: data.last_message_time,
								sender: data.last_message_sender,
								message_type: data.last_message_type
							}}
							lastMessageLoading={false}
							isSelected={data.phone_number === selectedChat}
							onChatDeleted={onChatDeleted}
							onSelected={selectChat}
						/>
					</div>
				);
			})}
		</div>
	);
};

export default InboxList;