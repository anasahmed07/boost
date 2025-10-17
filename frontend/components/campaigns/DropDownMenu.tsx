import type {Campaign} from "@/types/campaigns";
import {Edit, Eye, Trash2} from "lucide-react";

const DropdownMenu = ({
						  campaign,
						  isOpen,
						  onViewAnalytics,
						  onDelete
					  }: {
	campaign: Campaign;
	isOpen: boolean;
	onViewAnalytics: (id: string) => void;
	onDelete: (id: string) => void;
}) => {
	if (!isOpen) return null

	return (
		<div className="absolute right-0 top-8 z-20 w-48 rounded-lg bg-white shadow-lg border border-gray-200 py-1">
			<button
				onClick={() => onViewAnalytics(campaign.id)}
				className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
			>
				<Eye className="w-4 h-4" />
				<span>View Analytics</span>
			</button>
			<button
				onClick={() => {
					console.log('Edit campaign:', campaign.id)
				}}
				className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
			>
				<Edit className="w-4 h-4" />
				<span>Edit Campaign</span>
			</button>
			<div className="border-t border-gray-100 my-1" />
			<button
				onClick={() => onDelete(campaign.id)}
				className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
			>
				<Trash2 className="w-4 h-4" />
				<span>Delete Campaign</span>
			</button>
		</div>
	)
}

export default DropdownMenu;