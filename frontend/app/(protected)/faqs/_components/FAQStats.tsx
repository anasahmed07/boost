import React from 'react';
import { MessageSquare } from 'lucide-react';

interface FAQStatsProps {
    total: number;
}

export default function FAQStats({ total }: FAQStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-600">Total FAQs</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
            </div>
        </div>
    );
}