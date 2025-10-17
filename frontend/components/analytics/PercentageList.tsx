interface PercentageItem {
	label: string;
	percentage: string;
}

interface PercentageListProps {
	title: string;
	subtitle: string;
	data: PercentageItem[];
}

export const PercentageList: React.FC<PercentageListProps> = ({
																  title,
																  subtitle,
																  data
															  }) => {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6">
			<div className="mb-4">
				<h3 className="text-sm font-medium text-gray-900">{title}</h3>
				<p className="text-xs text-gray-500">{subtitle}</p>
			</div>

			<div className="space-y-3">
				{data.map((item, index) => (
					<div key={index} className="flex justify-between items-center">
						<span className="text-sm text-gray-600">{item.label}</span>
						<span className="text-sm font-medium text-gray-900">{item.percentage}</span>
					</div>
				))}
			</div>
		</div>
	);
};