"use client";


import React, {useState, useEffect, useCallback} from 'react';
import { CheckCircle, Clock, Send, Users, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DeliveryDetail {
    id: string;
    template_id: string;
    template_name: string;
    campaign_id: string | null;
    phone_number: string;
    status: string;
    error_message: string | null;
    whatsapp_message_id: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

interface JobDeliveryStatus {
    job_id: string;
    template_id: string;
    template_name: string;
    campaign_id: string | null;
    status: string;
    total_recipients: number;
    successful_sends: number;
    failed_sends: number;
    pending_sends: number;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    delivery_details: DeliveryDetail[];
}

interface BulkJobStatus {
    job_id: string;
    status: string;
    message: string;
    template_id: string;
    template_name: string;
    total_recipients: number;
    estimated_completion_time: string;
}

interface BulkJobStatusProps {
    jobData: BulkJobStatus;
    onClose?: () => void;
}

const BulkJobStatusComponent: React.FC<BulkJobStatusProps> = ({ jobData, onClose }) => {
    const [deliveryStatus, setDeliveryStatus] = useState<JobDeliveryStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchDeliveryStatus = useCallback(async () => {
        try {
            const url = `/api/templates/delivery/${jobData.job_id}`;
            console.log(url)
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch delivery status');
            const data: JobDeliveryStatus = await response.json();
            setDeliveryStatus(data);

            // Stop auto-refresh if job is completed
            if (data.status === 'sent' || data.status === 'completed' || data.status === 'failed') {
                setAutoRefresh(false);
            }
        } catch (error) {
            console.error('Error fetching delivery status:', error);
        } finally {
            setLoading(false);
        }
    }, [jobData.job_id]);

    useEffect(() => {
        fetchDeliveryStatus();
    }, [fetchDeliveryStatus]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchDeliveryStatus();
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, fetchDeliveryStatus]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'processing':
            case 'pending':
                return 'bg-yellow-600';
            case 'sent':
            case 'completed':
            case 'delivered':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            case 'read':
                return 'bg-purple-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'processing':
            case 'pending':
                return <Clock className="text-yellow-500" size={24} />;
            case 'sent':
            case 'completed':
            case 'delivered':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'failed':
                return <XCircle className="text-red-500" size={24} />;
            default:
                return <Send className="text-gray-500" size={24} />;
        }
    };

    const getDeliveryStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            sent: 'bg-green-100 text-green-800',
            delivered: 'bg-blue-100 text-blue-800',
            read: 'bg-purple-100 text-purple-800',
            failed: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const getSuccessRate = () => {
        if (!deliveryStatus) return 0;
        if (deliveryStatus.total_recipients === 0) return 0;
        return Math.round((deliveryStatus.successful_sends / deliveryStatus.total_recipients) * 100);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 overflow-hidden">
                {/* Header with Status */}
                <div className={`${getStatusColor(deliveryStatus?.status || jobData.status)} p-6 text-white`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(deliveryStatus?.status || jobData.status)}
                            <div>
                                <h2 className="text-2xl font-bold capitalize">
                                    {deliveryStatus?.status || jobData.status}
                                </h2>
                                <p className="text-white text-opacity-90 text-sm mt-1">
                                    {deliveryStatus ? 'Delivery status updated' : 'Bulk message delivery initiated'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {autoRefresh && (
                                <RefreshCw className="animate-spin" size={20} />
                            )}
                            <button
                                onClick={() => {
                                    setAutoRefresh(true);
                                    fetchDeliveryStatus();
                                }}
                                className="cursor-pointer hover:bg-neutral-200 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors text-black"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <div className="p-6 border-b border-gray-200 bg-blue-50">
                    <p className="text-gray-800 leading-relaxed">{jobData.message}</p>
                </div>

                {loading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                        <span className="text-gray-600">Loading delivery details...</span>
                    </div>
                ) : (
                    <>
                        {/* Statistics */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Delivery Statistics</h3>
                                {deliveryStatus && (
                                    <div className="text-sm text-gray-500">
                                        Last updated: {formatDate(deliveryStatus.updated_at)}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Total Recipients */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="text-blue-500" size={18} />
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Total
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {deliveryStatus?.total_recipients || jobData.total_recipients}
                                    </p>
                                </div>

                                {/* Successful */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="text-green-500" size={18} />
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Success
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">
                                        {deliveryStatus?.successful_sends || 0}
                                    </p>
                                </div>

                                {/* Failed */}
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="text-red-500" size={18} />
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Failed
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-red-600">
                                        {deliveryStatus?.failed_sends || 0}
                                    </p>
                                </div>

                                {/* Pending */}
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="text-yellow-500" size={18} />
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Pending
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {deliveryStatus?.pending_sends || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Success Rate Bar */}
                            {deliveryStatus && (
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Success Rate</span>
                                        <span className="text-sm font-bold text-gray-900">{getSuccessRate()}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${getSuccessRate()}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delivery Details */}
                        {deliveryStatus && deliveryStatus.delivery_details.length > 0 && (
                            <div className="p-6 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Details</h3>
                                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Phone Number
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Sent At
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Error
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                        {deliveryStatus.delivery_details.map((detail) => (
                                            <tr key={detail.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                                                    {detail.phone_number}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getDeliveryStatusBadge(detail.status)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {formatDate(detail.sent_at)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {detail.error_message ? (
                                                        <div className="flex items-start gap-2 max-w-md">
                                                            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                                                            <span className="text-red-600 text-xs line-clamp-2">
                                                                    {detail.error_message.split('(')[0]}
                                                                </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">No errors</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Job Metadata */}
                        <div className="p-6 bg-gray-50 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Job Metadata</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Job ID:</span>
                                    <p className="font-mono text-xs text-gray-900 mt-1 break-all">{jobData.job_id}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Template:</span>
                                    <p className="font-medium text-gray-900 mt-1">{jobData.template_name}</p>
                                </div>
                                {deliveryStatus?.completed_at && (
                                    <div>
                                        <span className="text-gray-500">Completed:</span>
                                        <p className="text-gray-900 mt-1">{formatDate(deliveryStatus.completed_at)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Footer Actions */}
                <div className="p-6 bg-white border-t border-gray-200 flex justify-between gap-3 items-center">
                    <div className="text-sm text-neutral-500">You will never see this window once you close it</div>
                    <div className="flex flex-row gap-2">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="cursor-pointer px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-red-500 transition-colors"
                            >
                                Close
                            </button>
                        )}
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(jobData.job_id);
                            }}
                            className="cursor-pointer px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                        >
                            Copy Job ID
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkJobStatusComponent;