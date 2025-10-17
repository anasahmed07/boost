import type {Campaign} from "@/types/campaigns";
import {X} from "lucide-react";

const DeleteConfirmationModal = ({
									 campaignToDelete,
									 campaigns,
									 onClose,
									 onConfirm
								 }: {
	campaignToDelete: string | null;
	campaigns: Campaign[];
	onClose: () => void;
	onConfirm: () => void;
}) => {
	if (!campaignToDelete) return null

	const campaignName = campaigns.find((c) => c.id === campaignToDelete)?.name

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
					<button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
						<X className="h-5 w-5"/>
					</button>
				</div>
				<p className="mt-4 text-gray-600">
					Are you sure you want to delete the campaign{' '}
					<span className="font-semibold">{campaignName}</span>? This action cannot be undone.
				</p>
				<div className="mt-6 flex justify-end space-x-3">
					<button
						onClick={onClose}
						className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	)
}

export default DeleteConfirmationModal;