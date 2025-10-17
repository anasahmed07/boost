import {Gift, Plus} from "lucide-react";

const CampaignsHeader = ({ onCreateClick }: { onCreateClick: () => void }) => (
	<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div className="py-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
							<Gift className="w-6 h-6 text-white"/>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
							<p className="text-gray-600 mt-1">Manage your referral campaigns</p>
						</div>
					</div>
					<button
						onClick={onCreateClick}
						className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl"
					>
						<Plus className="w-5 h-5"/>
						<span>Create Campaign</span>
					</button>
				</div>
			</div>
		</div>
	</div>
);

export default CampaignsHeader;