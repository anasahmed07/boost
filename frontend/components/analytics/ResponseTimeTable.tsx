interface ResponseTimeTable {
	timeRange: string;
	responseTime: string;
}

interface ResponseTimeTableProps {
	title: string;
	subtitle: string;
	data: ResponseTimeTable[];
}

export const ResponseTimeTable: React.FC<ResponseTimeTableProps> = ({
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
						<span className="text-sm text-gray-600">{item.timeRange}</span>
						<span className="text-sm font-medium text-gray-900">{item.responseTime}</span>
					</div>
				))}
			</div>
		</div>
	);
};