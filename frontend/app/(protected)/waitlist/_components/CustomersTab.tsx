"use client";


import React from 'react';
import Spinner from '@/components/ui/Spinner';

interface Customer {
    phone: string;
    name: string;
    productCount: number;
    notified: boolean;
}

interface CustomersTabProps {
    customers: Customer[];
    loading: boolean;
    onViewDetails: (customer: Customer) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ customers, loading, onViewDetails }) => {
    if (loading) return <Spinner />;

    return (
        <div>
            <h2 className="text-2xl font-bold t mb-4">Customers Waiting</h2>
            <div className="overflow-x-auto bg-white rounded-lg">
                <table className="w-full">
                    <thead>
                    <tr className="bg-neutral-200 border-b-2 border-neutral-300">
                        <th className="text-left py-3 px-4  font-semibold">Name</th>
                        <th className="text-left py-3 px-4  font-semibold">Phone</th>
                        <th className="text-center py-3 px-4  font-semibold">Products Waiting</th>
                        <th className="text-center py-3 px-4  font-semibold">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {customers.map((customer, idx) => (
                        <tr key={idx} className="border-b border-neutral-100 bhover:bg-neutral-50 duration-100">
                            <td className="py-3 px-4 ">{customer.name}</td>
                            <td className="py-3 px-4 text-neutral-500">{customer.phone}</td>
                            <td className="py-3 px-4 text-center">
                                {customer.productCount}
                            </td>
                            <td className="py-3 px-4 text-center">
                                <button
                                    onClick={() => onViewDetails(customer)}
                                    className="cursor-pointer bg-yellow-400 hover:bg-yellow-600 text-white px-4 py-2 rounded-md transition-colors"
                                >
                                    View Details
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};