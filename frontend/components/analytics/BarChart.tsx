import React from "react";

interface BarChartProps {
	title: string;
	subtitle: string;
	data: Array<{ label: string; value: number }>;
	color?: 'yellow' | 'black';
}

export const BarChart: React.FC<BarChartProps> = ({
													  title,
													  subtitle,
													  data,
													  color = 'yellow'
												  }) => {
	const maxValue = Math.max(...data.map(d => d.value));
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6">
			<div className="flex items-center mb-4">
				<div className={`w-4 h-4 ${color === 'yellow' ? 'bg-yellow-400' : 'bg-gray-800'} rounded mr-3`}></div>
				<div>
					<h3 className="text-sm font-medium text-gray-900">{title}</h3>
					<p className="text-xs text-gray-500">{subtitle}</p>
				</div>
			</div>

			<div className="flex items-end justify-between h-48 space-x-2">
				{data.map((item, index) => (
					<div key={index} className="flex flex-col items-center flex-1 h-full self-baseline">
						<div
							className={`w-full ${
								color === 'yellow' ? 'bg-yellow-400' : 'bg-gray-800'
							} rounded-t transition-all duration-300`}
							style={{
								height: `${(item.value / maxValue) * 100}%`,
								minHeight: '8px'
							}}
						></div>
						<span className="text-xs text-gray-500 mt-2">{item.label}</span>
					</div>
				))}
			</div>
		</div>
	);
};