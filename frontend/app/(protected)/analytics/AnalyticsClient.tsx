"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { TrendingUp, Users, MessageSquare, AlertTriangle, Calendar } from 'lucide-react';

// Type definitions
interface EscalatedCustomer {
    phone_number: string;
    name: string;
    company: string | null;
    customer_type: string;
    spend: number;
    is_active: boolean;
    escalation_status: boolean;
}

interface DailyEscalationBreakdown {
    date: string;
    total_escalations: number;
    total_resolved: number;
    b2b_escalations: number;
    d2c_escalations: number;
    created_at: string;
    updated_at: string;
}

interface EscalationData {
    current_total_escalations: number;
    current_escalation_rate: number;
    current_escalated_by_type: {
        B2B: number;
        D2C: number;
    };
    escalated_customers: EscalatedCustomer[];
    historical_stats: {
        total_escalations: number;
        total_resolved: number;
        resolution_rate: number;
        b2b_escalations: number;
        d2c_escalations: number;
        active_days: number;
        avg_escalations_per_day: number;
        daily_breakdown: DailyEscalationBreakdown[];
    };
}

interface DailyStat {
    date: string;
    total_messages: number;
    text_messages: number;
    image_messages: number;
    video_messages: number;
    audio_messages: number;
    document_messages: number;
    total_customer_messages: number;
    total_agent_messages: number;
    total_representative_messages: number;
    created_at: string;
    updated_at: string;
}

interface MessageData {
    days: number;
    total_messages: number;
    avg_messages_per_day: number;
    message_types: {
        text: number;
        image: number;
        video: number;
        audio: number;
        document: number;
    };
    sender_types: {
        customer: number;
        agent: number;
        representative: number;
    };
    daily_stats: DailyStat[];
}

interface TopCustomer {
    phone_number: string;
    name: string;
    company: string | null;
    customer_type: string;
    spend: number;
    is_active: boolean;
    escalation_status: boolean;
}

interface OverviewData {
    customer_stats: {
        total_customers: number;
        active_customers: number;
        escalated_customers: number;
        b2b_customers: number;
        d2c_customers: number;
        avg_total_spend: number;
    };
    message_stats: {
        total_conversations: number;
        total_messages: number;
        avg_messages_per_conversation: number;
        message_types: {
            text: number;
            image: number;
            video: number;
            audio: number;
            document: number;
        };
        sender_types: {
            customer: number;
            agent: number;
            representative: number;
        };
        avg_messages_per_day: number;
        active_days: number;
    };
    escalation_stats: {
        total_escalations: number;
        total_resolved: number;
        resolution_rate: number;
        b2b_escalations: number;
        d2c_escalations: number;
        active_days: number;
        avg_escalations_per_day: number;
    };
    top_customers_by_spend: TopCustomer[];
}

interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: string | number;
}

interface DailyMessageChartData {
    date: string;
    messages: number;
    customer: number;
    agent: number;
    rawDate: string;
}

interface DailyEscalationChartData {
    date: string;
    escalations: number;
    resolved: number;
    rawDate: string;
}

const AnalyticsDashboard: React.FC = () => {
    const [dateRange, setDateRange] = useState<string>('week');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [escalationData, setEscalationData] = useState<EscalationData | null>(null);
    const [messageData, setMessageData] = useState<MessageData | null>(null);
    const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);





    useEffect(() => {

        const calculateDates = (range: string): { start: string; end: string } => {
            const today = new Date();
            const end = today.toISOString().split('T')[0];
            let start: string;

            switch (range) {
                case 'today':
                    start = end;
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    start = weekAgo.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    start = monthAgo.toISOString().split('T')[0];
                    break;
                case 'custom':
                    return { start: startDate, end: endDate };
                default:
                    start = end;
            }

            return { start, end };
        };

        const fetchData = async (): Promise<void> => {
            setLoading(true);
            const { start, end } = calculateDates(dateRange);

            try {
                const [escalations, messages, overview] = await Promise.all([
                    fetch(`/api/analytics/escalations?start_date=${start}&end_date=${end}`).then(r => r.json() as Promise<EscalationData>),
                    fetch(`/api/analytics/messages?start_date=${start}&end_date=${end}`).then(r => r.json() as Promise<MessageData>),
                    fetch(`/api/analytics/overview`).then(r => r.json() as Promise<OverviewData>)
                ]);

                setEscalationData(escalations);
                setMessageData(messages);
                setOverviewData(overview);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (dateRange !== 'custom' || (startDate && endDate)) {
            void fetchData();
        }
    }, [dateRange, startDate, endDate]);

    const COLORS = ['#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e'];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading analytics...</div>
            </div>
        );
    }

    const messageTypeData: ChartDataPoint[] = messageData ? Object.entries(messageData.message_types).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value
    })) : [];

    const senderTypeData: ChartDataPoint[] = messageData ? Object.entries(messageData.sender_types).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value
    })) : [];

    const dailyMessageStats: DailyMessageChartData[] = messageData?.daily_stats
        ?.map(day => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            messages: day.total_messages,
            customer: day.total_customer_messages,
            agent: day.total_agent_messages,
            rawDate: day.date
        }))
        .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()) ?? [];

    const dailyEscalationStats: DailyEscalationChartData[] = escalationData?.historical_stats?.daily_breakdown
        ?.map(day => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            escalations: day.total_escalations,
            resolved: day.total_resolved,
            rawDate: day.date
        }))
        .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()) ?? [];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Dashboard</h1>

                    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow">
                        <Calendar className="text-gray-500" size={20} />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        >
                            <option value="today">Today</option>
                            <option value="week">Past Week</option>
                            <option value="month">Past Month</option>
                            <option value="custom">Custom Range</option>
                        </select>

                        {dateRange === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 text-sm font-medium">Total Customers</h3>
                            <Users className="text-yellow-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{overviewData?.customer_stats?.total_customers ?? 0}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {overviewData?.customer_stats?.b2b_customers ?? 0} B2B / {overviewData?.customer_stats?.d2c_customers ?? 0} D2C
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 text-sm font-medium">Total Messages</h3>
                            <MessageSquare className="text-yellow-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{messageData?.total_messages ?? 0}</p>
                        <p className="text-sm text-gray-500 mt-2">Avg {messageData?.avg_messages_per_day ?? 0} per day</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 text-sm font-medium">Current Escalations</h3>
                            <AlertTriangle className="text-yellow-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{escalationData?.current_total_escalations ?? 0}</p>
                        <p className="text-sm text-gray-500 mt-2">Rate: {escalationData?.current_escalation_rate ?? 0}%</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 text-sm font-medium">Avg Customer Spend</h3>
                            <TrendingUp className="text-yellow-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            Rs {overviewData?.customer_stats?.avg_total_spend?.toFixed(2) ?? '0.00'} /-
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Per customer</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Message Activity</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailyMessageStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="messages" stroke="#facc15" name="Total Messages" strokeWidth={2} />
                                <Line type="monotone" dataKey="customer" stroke="#eab308" name="Customer" strokeWidth={2} />
                                <Line type="monotone" dataKey="agent" stroke="#ca8a04" name="Agent" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation Trends</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyEscalationStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="escalations" fill="#ef4444" name="Escalations" />
                                <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Types Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={messageTypeData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip />
                                <Bar dataKey="value" name="Messages">
                                    {messageTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sender Types Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={senderTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {senderTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Volume Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={dailyMessageStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="messages" stackId="1" stroke="#facc15" fill="#facc15" name="Total Messages" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer vs Agent Activity</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={dailyMessageStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="customer" fill="#eab308" name="Customer Messages" />
                                <Bar dataKey="agent" fill="#ca8a04" name="Agent Messages" />
                                <Line type="monotone" dataKey="messages" stroke="#854d0e" strokeWidth={2} name="Total" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation Status Breakdown</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'B2B Escalations', value: escalationData?.current_escalated_by_type?.B2B ?? 0 },
                                        { name: 'D2C Escalations', value: escalationData?.current_escalated_by_type?.D2C ?? 0 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#f97316" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Type Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'B2B Customers', value: overviewData?.customer_stats?.b2b_customers ?? 0 },
                                        { name: 'D2C Customers', value: overviewData?.customer_stats?.d2c_customers ?? 0 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#8b5cf6" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Performance Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dailyEscalationStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="escalations" stackId="1" stroke="#ef4444" fill="#ef4444" name="Escalations" />
                            <Area type="monotone" dataKey="resolved" stackId="2" stroke="#10b981" fill="#10b981" name="Resolved" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Spend</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {overviewData?.top_customers_by_spend?.map((customer, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.customer_type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">Rs {customer.spend.toLocaleString()} /-</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.escalation_status ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {customer.escalation_status ? 'Escalated' : 'Active'}
                      </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-gray-500 text-sm font-medium mb-2">Historical Escalations</h3>
                        <p className="text-2xl font-bold text-gray-900">{escalationData?.historical_stats?.total_escalations ?? 0}</p>
                        <p className="text-sm text-green-600 mt-2">
                            {escalationData?.historical_stats?.total_resolved ?? 0} resolved ({escalationData?.historical_stats?.resolution_rate?.toFixed(1) ?? '0.0'}%)
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-gray-500 text-sm font-medium mb-2">Total Conversations</h3>
                        <p className="text-2xl font-bold text-gray-900">{overviewData?.message_stats?.total_conversations ?? 0}</p>
                        <p className="text-sm text-gray-600 mt-2">
                            Avg {overviewData?.message_stats?.avg_messages_per_conversation?.toFixed(1) ?? '0.0'} messages per conversation
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-gray-500 text-sm font-medium mb-2">Active Period</h3>
                        <p className="text-2xl font-bold text-gray-900">{messageData?.days ?? 0} days</p>
                        <p className="text-sm text-gray-600 mt-2">
                            In selected date range
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;