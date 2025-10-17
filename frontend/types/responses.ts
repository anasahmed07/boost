import {UserData} from "@/types/user";

export interface UsersApiResponse {
	customers: UserData[];
}

interface ChatMessage {
	time_stamp: string;
	content: string;
	message_type: 'audio' | 'text' | 'image' | string; // can refine if needed
	sender: string;
}

export interface ChatApiResponse {
	phone_number: string;
	page: number;
	messages: ChatMessage[];
}


export interface AnalyticsOverview {
	customer_stats: {
		total_customers: number;
		active_customers: number;
		escalated_customers: number;
		b2b_customers: number;
		d2c_customers: number;
		avg_total_spend: number;
	};
	message_stats: {
		total_conversations: number;
		total_messages: number;
		avg_messages_per_conversation: number;
		message_types: {
			text: number;
			image: number;
			voice: number;
			audio: number;
		};
	};
	top_customers_by_spend: Array<{
		phone_number: string;
		name: string | null;
		spend: number;
	}>;
}

export interface MessageAnalytics {
	total_conversations: number;
	total_messages: number;
	avg_messages_per_conversation: number;
	message_types: {
		text: number;
		image: number;
		voice: number;
		audio: number;
	}
}

export interface CustomerAnalytics {
	total: number;
	active: number;
	inactive: number;
	escalated: number;
	by_type: {
		B2B: number;
		D2C: number;
	},
	spend_analysis: {
		total_spend: number;
		avg_spend: number;
		high_value_customers: number;
	}
}

interface EscalatedCustomer {
	phone_number: string;
	customer_name: string;
	customer_type: string;
	total_spend: number;
}

export interface EscalationAnalytics {
	total_escalations: number;
	escalation_rate: number;
	escalated_by_type: {
		B2B: number;
		D2C: number;
	},
	escalated_customers: EscalatedCustomer[];
}