import {Gift} from "lucide-react";

const EmptyState = ({ searchTerm, onCreateClick }: { searchTerm: string; onCreateClick: () => void }) => (
	<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
		<Gift className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
		<h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
		<p className="text-gray-600 mb-6">
			{searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first referral campaign'}
		</p>
		{!searchTerm && (
			<button
				onClick={onCreateClick}
				className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold"
			>
				Create First Campaign
			</button>
		)}
	</div>
)

export default EmptyState;