export type ChatDataPreview = {
	name: string;
	phoneNumber: string;
	recentMessage: string;
	timeAgo: string;
	messageType?: string;
	customer_name?: string;
}

export type ChatMessage = {
	time_stamp: string;
	content: string;
	message_type: 'audio' | 'text' | 'image' | string;
	sender: string;
}

export type ChatData = {
	messages: ChatMessage[];
};

export type ChatsData = {
	phone_number: string;
	is_active: boolean;
	escalation_status: boolean;
	customer_type: string;
	total_spend: number;
	customer_name: string;
	email: string | null;
	address: string | null;
	cart_id: string | null;
	order_history: string | null;
	socials: string | null;
	interest_groups: string | null;
	customer_quickbook_id: string | null;
	tags: string[],
	company_name: string;
	last_message: string;
	last_message_time: string;
	last_message_sender: string;
	last_message_type: string;
}