import React from 'react';
import {Plus, Download, Upload} from 'lucide-react';
import { PageHeading } from '@/components/ui/Structure';
import Link from 'next/link';

interface FAQHeaderProps {
    onAddClick: () => void;
}

export default function FAQHeader({ onAddClick }: FAQHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <PageHeading title="FAQs" description="Create and manage FAQs" />
            <div className="flex gap-2">
                <button
                    onClick={onAddClick}
                    className="text-sm cursor-pointer flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200"
                >
                    <Plus className="w-4 h-4" />
                    Add FAQ
                </button>

                <Link
                    href="/faqs/import"
                    className="text-sm flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200"
                >
                    <Upload className="w-4 h-4" />
                    Import FAQs
                </Link>

                <Link
                    href="/faqs/export"
                    className="text-sm flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200"
                >
                    <Download className="w-4 h-4" />
                    Export FAQs
                </Link>
            </div>
        </div>
    );
}