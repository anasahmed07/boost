import React from "react";
import {ChatMessage} from "@/types/chat";

export type UserData = {
	phone_number: string;
	is_active?: boolean;
	escalation_status?: boolean;
	customer_type?: string;
	total_spend?: number;
	customer_name?: string | null;
	email?: string | null;
	address?: string | null;
	cart_id?: string | null;
	order_history?: string | null;
	socials?: string | null;
	customer_quickbook_id?: string | null;
	tags?: string[];
	interest_groups?: string | null;
	company_name?: string | null;
}

export interface CustomerChats extends UserData {
	company_name: string | null,
	last_message: string;
	last_message_time: string;
	last_message_sender: "agent" | "representative" | "customer";
	last_message_type: "text" | "image" | "audio" | string;
	status: 'active';
}

export interface ExtendedUserData extends UserData {
	status?: 'active' | 'chat_only' | 'customer_only';
	hasChat?: boolean;
	hasCustomerData?: boolean;
	latestMessage?: ChatMessage | null;
	lastMessageLoading?: boolean;
}


export type UserMetric = {
	name: string;
	number: number;
	icon?: React.ElementType;
	color?: string;
}