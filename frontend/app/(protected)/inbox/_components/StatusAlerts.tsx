import {AlertCircle, AlertTriangle} from "lucide-react";

export interface StatusAlertsProps {
	escalatedCount: number;
	chatOnlyCount: number;
	customerOnlyCount: number;
	loading: boolean;
	error: string | null;
}

const StatusAlerts = ({ escalatedCount, chatOnlyCount, customerOnlyCount, loading, error }: StatusAlertsProps) => {
	if (loading || error) {
		return null;
	}

	return (
		<>
			{(chatOnlyCount > 0 || customerOnlyCount > 0) && (
				<div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
					<AlertCircle className="h-5 w-5 text-yellow-600" />
					<span className="text-yellow-800 font-medium">
						{customerOnlyCount} customers exist without chats
					</span>
				</div>
			)}
			{escalatedCount > 0 && (
				<div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
					<AlertTriangle className="h-5 w-5 text-red-600" />
					<span className="text-red-800 font-medium">
						{escalatedCount} conversation{escalatedCount !== 1 ? 's' : ''} require{escalatedCount === 1 ? 's' : ''} escalation attention
					</span>
				</div>
			)}
		</>
	);
};

export default StatusAlerts;