import React from 'react';
import { Search } from 'lucide-react';

interface FAQSearchFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

export default function FAQSearchFilter({
                                            searchTerm,
                                            onSearchChange
                                        }: FAQSearchFilterProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search questions or answers..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>
            </div>
        </div>
    );
}