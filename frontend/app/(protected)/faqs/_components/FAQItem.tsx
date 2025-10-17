import React, { useRef } from 'react';
import {
    MessageSquare,
    AlertCircle,
    CheckCircle,
    EllipsisVertical,
    Edit,
    Trash2
} from 'lucide-react';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    updated_at: string;
    author: string;
}

interface FAQItemProps {
    faq: FAQ;
    isUnanswered: boolean;
    activeDropdown: string | null;
    deletingId: string | null;
    onEdit: () => void;
    onDelete: () => void;
    onToggleDropdown: () => void;
}

export default function FAQItem({
                                    faq,
                                    isUnanswered,
                                    activeDropdown,
                                    deletingId,
                                    onEdit,
                                    onDelete,
                                    onToggleDropdown
                                }: FAQItemProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className={`bg-white rounded-lg shadow-sm border p-6 ${
                isUnanswered ? 'border-l-4 border-l-red-400' : ''
            }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-600">Question #{faq.id}</span>
                            <span className="font-sm font-medium text-neutral-500">•</span>
                            <span className="text-xs font-medium text-neutral-500">
								Last Modified: <span className={!!faq.author ? "underline" : ""}>{faq.author || "Unknown"}</span> at{' '}
                                {new Date(faq.updated_at).toLocaleString('en-PK', {
                                    timeZone: 'Asia/Karachi'
                                })}
							</span>
                        </div>
                        {isUnanswered && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
								<AlertCircle className="w-3 h-3" />
								Unanswered
							</span>
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                </div>

                {/* Dropdown Menu */}
                <div className="relative" ref={dropdownRef}>
                    <div
                        className="flex cursor-pointer hover:shadow-sm duration-100 p-1 rounded-md hover:bg-neutral-100"
                        onClick={onToggleDropdown}
                    >
                        <EllipsisVertical className="flex" size={16} />
                    </div>

                    {activeDropdown === faq.id && (
                        <div className="absolute right-0 top-8 bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-10 min-w-48">
                            <button
                                onClick={onEdit}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Edit size={14} />
                                Edit FAQ
                            </button>
                            <button
                                onClick={onDelete}
                                disabled={deletingId === faq.id}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={14} />
                                {deletingId === faq.id ? 'Deleting...' : 'Delete FAQ'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle
                        className={`w-4 h-4 ${isUnanswered ? 'text-gray-400' : 'text-green-500'}`}
                    />
                    <span className="text-sm font-medium text-gray-600">Answer</span>
                </div>
                <div
                    className={`p-3 rounded-lg ${
                        isUnanswered
                            ? 'bg-gray-50 border border-gray-200'
                            : 'bg-green-50 border border-green-200'
                    }`}
                >
                    <p className={`${isUnanswered ? 'text-gray-500 italic' : 'text-gray-700'}`}>
                        {isUnanswered ? 'No answer provided yet' : faq.answer}
                    </p>
                </div>
            </div>
        </div>
    );
}