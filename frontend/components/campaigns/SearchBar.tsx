import {Search} from "lucide-react";

const SearchBar = ({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) => (
	<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
		<div className="relative">
			<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"/>
			<input
				type="text"
				placeholder="Search campaigns..."
				value={searchTerm}
				onChange={(e) => onSearchChange(e.target.value)}
				className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
			/>
		</div>
	</div>
);

export default SearchBar;