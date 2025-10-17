"use client";

import {Campaign} from "@/types/campaigns";

import React, {useState, useEffect, useCallback} from 'react';
import { Trophy, Users, Award, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaderboardEntry {
	referrer_name: string;
	referrer_phone: string;
	points: number;
	total_referrals: number;
	rank: number;
}

interface Pagination {
	current_page: number;
	page_size: number;
	total_pages: number;
	total_entries: number;
}

interface LeaderboardData {
	campaign_id: string;
	pagination: Pagination;
	leaderboard: LeaderboardEntry[];
}

const ReferralLeaderboard = ({campaign, onClose}: { campaign: Campaign, onClose: () => void }) => {
	const [data, setData] = useState<LeaderboardData | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [currentPage, setCurrentPage] = useState<number>(1);



	const fetchLeaderboard = useCallback(async (page: number = 1): Promise<void> => {
		setLoading(true);
		try {
			const response = await fetch(`/api/analytics/leaderboard/${campaign.id}`);
			const result = await response.json() as LeaderboardData;
			setData(result);
			setCurrentPage(page);
		} catch (error) {
			console.error('Error fetching leaderboard:', error);
		} finally {
			setLoading(false);
		}
	}, [campaign.id]);

	useEffect(() => {
		void fetchLeaderboard();
	}, [fetchLeaderboard]);

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center">
				<div className="text-xl text-gray-600">Loading leaderboard...</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center">
				<div className="text-xl text-gray-600">No data available</div>
			</div>
		);
	}

	const totalPoints = data.leaderboard.reduce((sum, entry) => sum + entry.points, 0);
	const totalReferrals = data.leaderboard.reduce((sum, entry) => sum + entry.total_referrals, 0);
	const avgPointsPerReferrer = data.leaderboard.length > 0 ? (totalPoints / data.leaderboard.length).toFixed(1) : '0';

	const getRankBadgeColor = (rank: number): string => {
		if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
		if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
		if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
		return 'bg-gray-100 text-gray-700';
	};

	const getRankIcon = (rank: number) => {
		if (rank <= 3) {
			return <Trophy className={rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-amber-700'} size={24} />;
		}
		return null;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 p-6">
			<button
				onClick={onClose}
				className="p-2 hover:shadow-sm rounded-full duration-200 items-center justify-center cursor-pointer flex text-black border border-neutral-400  duration-150"
			>
				<ChevronLeft size={14}/>
			</button>
			<div className="max-w-6xl mx-auto">
				<div className="mb-8 text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-full mb-4">
						<Trophy className="text-white" size={32} />
					</div>
					<h1 className="text-4xl font-bold text-gray-900 mb-2">Referral Leaderboard</h1>
					<p className="text-gray-600">Campaign ID: <span className="font-semibold text-yellow-600">{data.campaign_id}</span></p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-gray-500 text-sm font-medium">Total Participants</h3>
							<Users className="text-yellow-500" size={24} />
						</div>
						<p className="text-3xl font-bold text-gray-900">{data.pagination.total_entries}</p>
						<p className="text-sm text-gray-500 mt-1">Active referrers</p>
					</div>

					<div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-gray-500 text-sm font-medium">Total Referrals</h3>
							<TrendingUp className="text-blue-500" size={24} />
						</div>
						<p className="text-3xl font-bold text-gray-900">{totalReferrals}</p>
						<p className="text-sm text-gray-500 mt-1">Successful referrals</p>
					</div>

					<div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-gray-500 text-sm font-medium">Total Points</h3>
							<Award className="text-purple-500" size={24} />
						</div>
						<p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
						<p className="text-sm text-gray-500 mt-1">Points distributed</p>
					</div>

					<div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-gray-500 text-sm font-medium">Avg Points</h3>
							<TrendingUp className="text-green-500" size={24} />
						</div>
						<p className="text-3xl font-bold text-gray-900">{avgPointsPerReferrer}</p>
						<p className="text-sm text-gray-500 mt-1">Per referrer</p>
					</div>
				</div>

				<div className="bg-white rounded-xl shadow-lg overflow-hidden">
					<div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-6">
						<h2 className="text-2xl font-bold text-white flex items-center gap-2">
							<Trophy size={28} />
							Top Performers
						</h2>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full">
							<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referrer</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
								<th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Referrals</th>
								<th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Points</th>
							</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
							{data.leaderboard.map((entry) => (
								<tr key={entry.referrer_phone} className="hover:bg-yellow-50 transition-colors">
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center gap-2">
											{getRankIcon(entry.rank)}
											<span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getRankBadgeColor(entry.rank)}`}>
                                                    {entry.rank}
                                                </span>
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="text-sm font-semibold text-gray-900">
											{entry.referrer_name || 'Customer'}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-600 font-mono">
											{entry.referrer_phone}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                                {entry.total_referrals}
                                            </span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                                                {entry.points} pts
                                            </span>
									</td>
								</tr>
							))}
							</tbody>
						</table>
					</div>

					{data.pagination.total_pages > 1 && (
						<div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
							<div className="text-sm text-gray-600">
								Showing page {data.pagination.current_page} of {data.pagination.total_pages}
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => fetchLeaderboard(currentPage - 1)}
									disabled={currentPage === 1}
									className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									<ChevronLeft size={16} />
									Previous
								</button>
								<button
									onClick={() => fetchLeaderboard(currentPage + 1)}
									disabled={currentPage === data.pagination.total_pages}
									className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									Next
									<ChevronRight size={16} />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ReferralLeaderboard;