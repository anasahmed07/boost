import {Plus, Sparkles, Trash2, Trophy} from "lucide-react";
import {CreateCampaignFormData} from "@/types/campaigns";

const CreateCampaignForm = ({
								formData,
								currentPrize,
								onFormDataChange,
								onCurrentPrizeChange,
								onSubmit,
								onCancel,
								onAddPrize,
								onRemovePrize
							}: {
	formData: CreateCampaignFormData;
	currentPrize: string;
	onFormDataChange: (data: CreateCampaignFormData) => void;
	onCurrentPrizeChange: (prize: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	onAddPrize: () => void;
	onRemovePrize: (index: number) => void;
}) => (
	<div className="min-h-screen bg-gray-50">
		<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<button
								onClick={onCancel}
								className="text-gray-600 hover:text-gray-800 transition-colors"
							>
								← Back
							</button>
							<div className="flex items-center space-x-2">
								<div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
									<Sparkles className="w-5 h-5 text-white"/>
								</div>
								<h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="space-y-6">
					{/* Campaign Name */}
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Name *</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(e) => onFormDataChange({...formData, name: e.target.value})}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
							placeholder="Enter campaign name"
						/>
					</div>

					{/* Date Range */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
							<input
								type="date"
								required
								value={formData.start_date}
								onChange={(e) => onFormDataChange({...formData, start_date: e.target.value})}
								min={new Date().toISOString().split('T')[0]}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
							<input
								type="date"
								required
								value={formData.end_date}
								onChange={(e) => onFormDataChange({...formData, end_date: e.target.value})}
								min={
									formData.start_date
										? new Date(new Date(formData.start_date).getTime() + 24 * 60 * 60 * 1000)
											.toISOString()
											.split("T")[0]
										: new Date(Date.now() + 24 * 60 * 60 * 1000)
											.toISOString()
											.split("T")[0]
								}
								className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
							/>
						</div>
					</div>

					<div className="text-xs text-gray-500 -mt-4">
						<p>• Start date cannot be in the past</p>
						<p>• End date must be after the start date</p>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
						<textarea
							required
							rows={4}
							value={formData.description}
							onChange={(e) => onFormDataChange({...formData, description: e.target.value})}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all resize-none"
							placeholder="Describe your campaign..."
						/>
					</div>

					{/* Prizes */}
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">Prizes</label>

						<div className="flex space-x-2 mb-4">
							<input
								type="text"
								value={currentPrize}
								onChange={(e) => onCurrentPrizeChange(e.target.value)}
								className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
								placeholder="Enter a prize"
								onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddPrize())}
							/>
							<button
								type="button"
								onClick={onAddPrize}
								className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
							>
								<Plus className="w-5 h-5"/>
							</button>
						</div>

						{formData.prizes.length > 0 && (
							<div className="space-y-2">
								{formData.prizes.map((prize, index) => (
									<div key={index} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
										<div className="flex items-center space-x-2">
											<Trophy className="w-4 h-4 text-yellow-600"/>
											<span className="text-gray-900 font-medium">{prize}</span>
										</div>
										<button
											type="button"
											onClick={() => onRemovePrize(index)}
											className="text-red-500 hover:text-red-700 transition-colors"
										>
											<Trash2 className="w-4 h-4"/>
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Submit Button */}
				<div className="mt-8 flex space-x-3">
					<button
						type="submit"
						className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold flex items-center justify-center space-x-2"
					>
						<Sparkles className="w-5 h-5"/>
						<span>Create Campaign</span>
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
)

export default CreateCampaignForm;