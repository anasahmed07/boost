import React from 'react';

interface KPICardProps {
	title: string;
	value: string | number;
	change: string;
	isPositive: boolean;
	icon: React.ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon }) => {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-medium text-gray-600">{title}</h3>
				<div className="text-gray-400">{icon}</div>
			</div>
			<div className="space-y-2">
				<div className="text-2xl font-bold text-gray-900">{value}</div>
				{/*<div className={`text-sm ${isPositive ? 'text-yellow-500' : 'text-red-500'}`}>*/}
				{/*	{change} from last week*/}
				{/*</div>*/}
			</div>
		</div>
	);
};