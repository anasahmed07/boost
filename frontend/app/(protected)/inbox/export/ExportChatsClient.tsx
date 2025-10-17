'use client';

import { useState } from 'react';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Toast from "@/components/ui/Toast"
import {createClient} from "@/lib/supabase/client";

type ExportFormat = 'json' | 'csv' | 'text';
type TimeRange = '12' | '24' | '48' | '72' | 'all';

interface Message {
    sender: string;
    content: string;
    time_stamp: string;
    message_type: string;
}

interface ChatRecord {
    idx?: number;
    phone_number: string;
    messages: string | Message[]; // Can be string or already parsed array
    created_at: string;
    updated_at: string;
}

// interface ToastProps {
//     message: string;
//     type?: 'success' | 'error';
//     duration?: number;
//     onClose?: () => void;
//     show?: boolean;
// }


export default function ChatExportPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('24');
    const [format, setFormat] = useState<ExportFormat>('json');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const supabase = createClient();

    const getTimeRangeFilter = (range: TimeRange): string | null => {
        if (range === 'all') return null;

        const now = new Date();
        const hours = parseInt(range);
        const cutoffDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
        return cutoffDate.toISOString();
    };

    const parseMessages = (messagesData: string | Message[]): Message[] => {
        // If it's already an array, return it
        if (Array.isArray(messagesData)) {
            return messagesData;
        }

        // If it's a string, try to parse it
        if (typeof messagesData === 'string') {
            try {
                const parsed = JSON.parse(messagesData);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error('Error parsing messages:', e);
                return [];
            }
        }

        return [];
    };

    const exportToJSON = (chats: ChatRecord[]) => {
        const formatted = chats.map(chat => {
            const messages = parseMessages(chat.messages);

            return {
                phone_number: chat.phone_number,
                created_at: chat.created_at,
                updated_at: chat.updated_at,
                message_count: messages.length,
                messages: messages
            };
        });

        const blob = new Blob([JSON.stringify(formatted, null, 2)], {
            type: 'application/json'
        });
        downloadFile(blob, `chat-export-${Date.now()}.json`);
    };

    const exportToCSV = (chats: ChatRecord[]) => {
        const rows: string[] = [];

        // CSV Header
        rows.push('Phone Number,Created At,Updated At,Sender,Message,Timestamp,Message Type');

        chats.forEach(chat => {
            const messages = parseMessages(chat.messages);

            if (messages.length === 0) {
                // Include chats with no messages as a single row
                const row = [
                    chat.phone_number,
                    chat.created_at,
                    chat.updated_at,
                    'N/A',
                    'No messages',
                    'N/A',
                    'N/A'
                ].join(',');
                rows.push(row);
            } else {
                messages.forEach(msg => {
                    const row = [
                        chat.phone_number,
                        chat.created_at,
                        chat.updated_at,
                        msg.sender,
                        `"${msg.content.replace(/"/g, '""')}"`,
                        msg.time_stamp,
                        msg.message_type
                    ].join(',');
                    rows.push(row);
                });
            }
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        downloadFile(blob, `chat-export-${Date.now()}.csv`);
    };

    const exportToText = (chats: ChatRecord[]) => {
        const lines: string[] = [];

        chats.forEach((chat, index) => {
            lines.push('='.repeat(80));
            lines.push(`CHAT #${index + 1}`);
            lines.push(`Phone: ${chat.phone_number}`);
            lines.push(`Created: ${chat.created_at}`);
            lines.push(`Updated: ${chat.updated_at}`);
            lines.push('='.repeat(80));
            lines.push('');

            const messages = parseMessages(chat.messages);

            if (messages.length === 0) {
                lines.push('(No messages in this conversation)');
                lines.push('');
            } else {
                messages.forEach((msg) => {
                    lines.push(`[${msg.time_stamp}] ${msg.sender.toUpperCase()}`);
                    lines.push(msg.content);
                    lines.push('');
                });
            }

            lines.push('');
            lines.push('');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        downloadFile(blob, `chat-export-${Date.now()}.txt`);
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
        setLoading(true);
        setToast(null);

        try {
            let query = supabase
                .from('chat_history')
                .select('*')
                .order('created_at', { ascending: false });

            const cutoffDate = getTimeRangeFilter(timeRange);
            if (cutoffDate) {
                query = query.gte('created_at', cutoffDate);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                throw new Error(`Failed to fetch chats: ${fetchError.message}`);
            }

            if (!data || data.length === 0) {
                setToast({
                    message: 'No chats found for the selected time range.',
                    type: 'error'
                });
                return;
            }

            // Count total messages
            let totalMessages = 0;
            data.forEach(chat => {
                const messages = parseMessages(chat.messages);
                totalMessages += messages.length;
            });

            switch (format) {
                case 'json':
                    exportToJSON(data);
                    break;
                case 'csv':
                    exportToCSV(data);
                    break;
                case 'text':
                    exportToText(data);
                    break;
            }

            setToast({
                message: `Successfully exported ${data.length} chat(s) with ${totalMessages} message(s) as ${format.toUpperCase()}`,
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
                        Export Chat History
                    </h1>
                    <p className="text-slate-600 mb-8">
                        Export your Supabase chat conversations in multiple formats
                    </p>

                    {/* Time Range Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Time Range
                        </label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                        >
                            <option value="12">Last 12 hours</option>
                            <option value="24">Last 24 hours</option>
                            <option value="48">Last 48 hours</option>
                            <option value="72">Last 72 hours</option>
                            <option value="all">All chats</option>
                        </select>
                    </div>

                    {/* Format Selection */}
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

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={loading}
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
                            'Export Chats'
                        )}
                    </button>

                    {/* Info Section */}
                    <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-yellow-900 mb-2">Export Formats:</h3>
                        <ul className="text-sm text-yellow-800 space-y-1">
                            <li><strong>JSON:</strong> Structured data with nested messages and message count (recommended).</li>
                            <li><strong>CSV:</strong> Spreadsheet format with one row per message</li>
                            <li><strong>TEXT:</strong> Human-readable conversation format</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}