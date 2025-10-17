"use client";

import React, { useState, useEffect } from 'react';
import Toast from "@/components/ui/Toast";

type ExportFormat = 'json' | 'csv' | 'text';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    updated_at: string;
    author: string;
}

interface FAQResponse {
    store_name: string;
    faqs: FAQ[];
}

export default function FAQExportPage() {
    const [format, setFormat] = useState<ExportFormat>('json');
    const [loading, setLoading] = useState(false);
    const [faqData, setFaqData] = useState<FAQResponse | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        try {
            const response = await fetch('/api/faqs/list');
            const data = await response.json() as FAQResponse;
            setFaqData(data);
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            setToast({
                message: 'Failed to fetch FAQs',
                type: 'error'
            });
        }
    };

    const exportToJSON = (faqs: FAQ[]) => {
        const formatted = {
            store_name: faqData?.store_name,
            export_date: new Date().toISOString(),
            total_faqs: faqs.length,
            faqs: faqs
        };

        const blob = new Blob([JSON.stringify(formatted, null, 2)], {
            type: 'application/json'
        });
        downloadFile(blob, `faq-export-${Date.now()}.json`);
    };

    const exportToCSV = (faqs: FAQ[]) => {
        const rows: string[] = [];

        rows.push('ID,Question,Answer,Updated At,Author');

        faqs.forEach(faq => {
            const row = [
                faq.id,
                `"${faq.question.replace(/"/g, '""')}"`,
                `"${faq.answer.replace(/"/g, '""')}"`,
                faq.updated_at,
                faq.author
            ].join(',');
            rows.push(row);
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        downloadFile(blob, `faq-export-${Date.now()}.csv`);
    };

    const exportToText = (faqs: FAQ[]) => {
        const lines: string[] = [];

        lines.push('='.repeat(80));
        lines.push(`FAQ EXPORT - ${faqData?.store_name}`);
        lines.push(`Total FAQs: ${faqs.length}`);
        lines.push(`Exported: ${new Date().toLocaleString()}`);
        lines.push('='.repeat(80));
        lines.push('');
        lines.push('');

        faqs.forEach((faq, index) => {
            lines.push(`FAQ #${index + 1}`);
            lines.push('-'.repeat(80));
            lines.push(`ID: ${faq.id}`);
            lines.push(`Author: ${faq.author}`);
            lines.push(`Updated: ${faq.updated_at}`);
            lines.push('');
            lines.push(`Q: ${faq.question}`);
            lines.push('');
            lines.push(`A: ${faq.answer}`);
            lines.push('');
            lines.push('');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        downloadFile(blob, `faq-export-${Date.now()}.txt`);
    };

    const downloadFile = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        if (!faqData || faqData.faqs.length === 0) {
            setToast({
                message: 'No FAQs available to export',
                type: 'error'
            });
            return;
        }

        setLoading(true);
        setToast(null);

        try {
            switch (format) {
                case 'json':
                    exportToJSON(faqData.faqs);
                    break;
                case 'csv':
                    exportToCSV(faqData.faqs);
                    break;
                case 'text':
                    exportToText(faqData.faqs);
                    break;
            }

            setToast({
                message: `Successfully exported ${faqData.faqs.length} FAQ(s) as ${format.toUpperCase()}`,
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: err instanceof Error ? err.message : 'An error occurred during export',
                type: 'error'
            });
            console.error('Export error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    show={true}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        Export FAQs
                    </h1>
                    <p className="text-slate-600 mb-8">
                        Export your FAQ database in multiple formats
                    </p>

                    {faqData && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-900">
                                <strong>Store:</strong> {faqData.store_name}
                            </p>
                            <p className="text-sm text-blue-900">
                                <strong>Total FAQs:</strong> {faqData.faqs.length}
                            </p>
                        </div>
                    )}

                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Export Format
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['json', 'csv', 'text'] as ExportFormat[]).map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => setFormat(fmt)}
                                    className={`py-3 px-4 rounded-lg font-medium transition-all ${
                                        format === fmt
                                            ? 'bg-yellow-400 text-slate-900 shadow-lg scale-105'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {fmt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={loading || !faqData}
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-semibold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Exporting...
                            </span>
                        ) : (
                            'Export FAQs'
                        )}
                    </button>

                    <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-yellow-900 mb-2">Export Formats:</h3>
                        <ul className="text-sm text-yellow-800 space-y-1">
                            <li><strong>JSON:</strong> Structured data with metadata (recommended for re-importing)</li>
                            <li><strong>CSV:</strong> Spreadsheet format with one row per FAQ</li>
                            <li><strong>TEXT:</strong> Human-readable format with detailed formatting</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}