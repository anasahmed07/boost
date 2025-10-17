import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	handlePageChange: (page: number) => void;
	getPageNumbers: () => (number | string)[];
	loading: boolean;
}

const Pagination = ({
												   currentPage,
												   totalPages,
												   totalItems,
												   handlePageChange,
												   getPageNumbers,
												   loading
											   }: PaginationProps) => {
	return (
		<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
			<div className="text-sm text-gray-600">
				Page {currentPage} of {totalPages} ({totalItems} total items)
			</div>
			<div className="flex items-center gap-1">
				<button
					onClick={() => handlePageChange(1)}
					disabled={currentPage === 1 || loading}
					className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					title="First page"
				>
					<ChevronsLeft className="h-4 w-4" />
				</button>
				<button
					onClick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1 || loading}
					className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					title="Previous page"
				>
					<ChevronLeft className="h-4 w-4" />
				</button>
				<div className="hidden sm:flex items-center gap-1 mx-2">
					{getPageNumbers().map((pageNum, index) => (
						<button
							key={index}
							onClick={() => typeof pageNum === 'number' ? handlePageChange(pageNum) : undefined}
							disabled={pageNum === '...' || pageNum === currentPage || loading}
							className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
								pageNum === currentPage
									? 'bg-blue-600 text-white border border-blue-600'
									: pageNum === '...'
										? 'cursor-default text-gray-400'
										: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
							}`}
						>
							{pageNum}
						</button>
					))}
				</div>
				<div className="sm:hidden px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
					{currentPage} / {totalPages}
				</div>
				<button
					onClick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages || loading}
					className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					title="Next page"
				>
					<ChevronRight className="h-4 w-4" />
				</button>
				<button
					onClick={() => handlePageChange(totalPages)}
					disabled={currentPage === totalPages || loading}
					className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					title="Last page"
				>
					<ChevronsRight className="h-4 w-4" />
				</button>
			</div>
			<div className="flex items-center gap-2 text-sm">
				<span className="text-gray-600">Go to:</span>
				<input
					type="number"
					min={1}
					max={totalPages}
					value={currentPage}
					onChange={(e) => {
						const page = parseInt(e.target.value);
						if (page >= 1 && page <= totalPages) {
							handlePageChange(page);
						}
					}}
					className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
					disabled={loading}
				/>
			</div>
		</div>
	);
};

export default Pagination;