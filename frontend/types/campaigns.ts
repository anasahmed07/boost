export interface Campaign {
	id: string
	name: string
	prizes: string[]
	description: string
	start_date: string
	end_date: string
	status: boolean
	created_by: string
}

export interface CustomerTarget {
	phone_number: string;
	customer_name: string;
}

export interface CreateCampaignFormData {
	name: string
	start_date: string
	end_date: string
	description: string
	prizes: string[],
	targets: CustomerTarget[]
}

export interface User {
	id: string;
	email?: string;
}

export interface CampaignsPageProps {
	user: User | null;
}

export interface CampaignAnalytics {
	totalReferrals: number
	successfulReferrals: number
	totalPoints: number
	averagePointsPerUser: number
	topReferrers: { name: string; referrals: number; points: number }[]
	dailyStats: { date: string; referrals: number; chats: number }[]
	conversionRate: number
	totalChats: number
	uniqueUsers: number
	pointsDistributed: number
}
