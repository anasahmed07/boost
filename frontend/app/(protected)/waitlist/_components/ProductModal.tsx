"use client";

import React from 'react';
// import Image from 'next/image';
import { X, CheckCircle, XCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

interface WaitlistEntry {
    id: string;
    product_id: string;
    customer_phone: string;
    customer_name: string;
    created_at: string;
    notified: boolean;
}

interface Product {
    product_id: string;
    product_title: string;
    product_image: string;
    inventory_quantity: number;
}

interface ProductModalProps {
    product: Product;
    entries: WaitlistEntry[];
    loading: boolean;
    onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, entries, loading, onClose }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-yellow-500 text-white p-6 flex items-center justify-between">
                    <h3 className="text-2xl font-bold">Waitlist for {product.product_title}</h3>
                    <button
                        onClick={onClose}
                        className="hover:bg-yellow-600 p-2 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    {loading ? (
                        <Spinner />
                    ) : (
                        <>
                            <div className="mb-6 flex items-center space-x-4">
                                <div className="relative w-24 h-24 rounded-md overflow-hidden">
                                    <img
                                        src={product.product_image}
                                        alt={product.product_title}
                                        // fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="text-yellow-700">
                                        Total Waiting: <span className="font-bold text-yellow-900 text-xl">{entries.length}</span>
                                    </p>
                                    <p className="text-yellow-700">
                                        Current Stock: <span className="font-bold text-yellow-900">{product.inventory_quantity}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="bg-yellow-100 border-b-2 border-yellow-300">
                                        <th className="text-left py-3 px-4 text-yellow-900 font-semibold">Customer Name</th>
                                        <th className="text-left py-3 px-4 text-yellow-900 font-semibold">Phone</th>
                                        <th className="text-left py-3 px-4 text-yellow-900 font-semibold">Joined</th>
                                        <th className="text-center py-3 px-4 text-yellow-900 font-semibold">Notified</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {entries.map((entry) => (
                                        <tr key={entry.id} className="border-b border-yellow-100 hover:bg-yellow-50">
                                            <td className="py-3 px-4 text-yellow-900">{entry.customer_name}</td>
                                            <td className="py-3 px-4 text-yellow-700">{entry.customer_phone}</td>
                                            <td className="py-3 px-4 text-yellow-700 text-sm">{formatDate(entry.created_at)}</td>
                                            <td className="py-3 px-4 text-center">
                                                {entry.notified ? (
                                                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
