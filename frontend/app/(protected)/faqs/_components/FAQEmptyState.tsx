import React from 'react';
import { HelpCircle } from 'lucide-react';

interface FAQEmptyStateProps {
    hasAnyFAQs: boolean;
}

export default function FAQEmptyState({ hasAnyFAQs }: FAQEmptyStateProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs Found</h3>
            <p className="text-gray-600">
                {!hasAnyFAQs
                    ? 'Get started by creating your first FAQ.'
                    : 'Try adjusting your search or filter criteria.'}
            </p>
        </div>
    );
}