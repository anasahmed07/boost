import type {Campaign} from "@/types/campaigns";
import {Calendar, Gift, Trophy, Users} from "lucide-react";

const StatsGrid = ({ campaigns }: { campaigns: Campaign[] }) => {
	const activeCount = campaigns.filter(c => {
		const now = new Date()
		const start = new Date(c.start_date)
		const end = new Date(c.end_date)
		return c.status && now >= start && now <= end
	}).length

	const upcomingCount = campaigns.filter(c => {
		const now = new Date()
		const start = new Date(c.start_date)
		return c.status && now < start
	}).length

	const totalPrizes = campaigns.reduce((sum, c) => sum + c.prizes.length, 0)

	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-gray-600 text-sm font-medium">Total Campaigns</p>
						<p className="text-2xl font-bold text-gray-900 mt-1">{campaigns.length}</p>
					</div>
					<div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
						<Gift className="w-6 h-6 text-yellow-600"/>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-gray-600 text-sm font-medium">Active</p>
						<p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
					</div>
					<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
						<Calendar className="w-6 h-6 text-green-600"/>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-gray-600 text-sm font-medium">Upcoming</p>
						<p className="text-2xl font-bold text-blue-600 mt-1">{upcomingCount}</p>
					</div>
					<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<Users className="w-6 h-6 text-blue-600"/>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-gray-600 text-sm font-medium">Total Prizes</p>
						<p className="text-2xl font-bold text-yellow-600 mt-1">{totalPrizes}</p>
					</div>
					<div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
						<Trophy className="w-6 h-6 text-yellow-600"/>
					</div>
				</div>
			</div>
		</div>
	)
}

export default StatsGrid;