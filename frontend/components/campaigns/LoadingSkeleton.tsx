const LoadingSkeleton = () => (
	<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{[1, 2, 3, 4].map((i) => (
			<div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
						<div className="h-4 bg-gray-200 rounded w-1/4"></div>
					</div>
					<div className="h-6 bg-gray-200 rounded w-16"></div>
				</div>
				<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
				<div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
				<div className="flex space-x-2 mb-4">
					<div className="h-6 bg-gray-200 rounded w-20"></div>
					<div className="h-6 bg-gray-200 rounded w-20"></div>
				</div>
				<div className="flex space-x-2">
					<div className="h-6 bg-gray-200 rounded w-16"></div>
					<div className="h-6 bg-gray-200 rounded w-16"></div>
					<div className="h-6 bg-gray-200 rounded w-16"></div>
				</div>
			</div>
		))}
	</div>
);

export default LoadingSkeleton;