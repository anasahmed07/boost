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

interface Customer {
    phone: string;
    name: string;
}

interface CustomerModalProps {
    customer: Customer;
    entries: WaitlistEntry[];
    products: Product[];
    loading: boolean;
    onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ customer, entries, products, loading, onClose }) => {
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
                    <div>
                        <h3 className="text-2xl font-bold">{customer.name}</h3>
                        <p className="text-yellow-100">{customer.phone}</p>
                    </div>
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
                            <p className="text-yellow-700 mb-6">
                                Waiting for <span className="font-bold text-yellow-900 text-xl">{entries.length}</span> product(s)
                            </p>
                            <div className="space-y-4">
                                {entries.map((entry) => {
                                    const product = products.find(p => p.product_id === entry.product_id);
                                    return (
                                        <div key={entry.id} className="border-2 border-yellow-200 rounded-lg p-4 bg-white">
                                            <div className="flex items-center space-x-4">
                                                {product && (
                                                    <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={product.product_image}
                                                            alt={product.product_title}
                                                            // fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-yellow-900">{product?.product_title || 'Product'}</h4>
                                                    <p className="text-sm text-yellow-700 mt-1">Joined: {formatDate(entry.created_at)}</p>
                                                    <div className="flex items-center space-x-4 mt-2">
                                                        <span className="text-sm">
                                                            {entry.notified ? (
                                                                <span className="text-green-600 font-semibold flex items-center">
                                                                    <CheckCircle className="w-4 h-4 mr-1" /> Notified
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-600 flex items-center">
                                                                    <XCircle className="w-4 h-4 mr-1" /> Not Notified
                                                                </span>
                                                            )}
                                                        </span>
                                                        {product && (
                                                            <span className="text-sm text-yellow-700">
                                                                Stock: <span className="font-bold">{product.inventory_quantity}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
