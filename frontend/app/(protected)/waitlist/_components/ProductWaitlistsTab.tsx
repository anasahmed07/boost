"use client";

import React from 'react';
// import Image from 'next/image';
import Spinner from '@/components/ui/Spinner';

interface Product {
    product_id: string;
    product_title: string;
    product_image: string;
    product_url: string;
    waitlist_count: number;
    is_available: boolean;
    inventory_quantity: number;
}

interface ProductWaitlistsTabProps {
    products: Product[];
    loading: boolean;
    onViewWaitlist: (product: Product) => void;
}

export const ProductWaitlistsTab: React.FC<ProductWaitlistsTabProps> = ({ products, loading, onViewWaitlist }) => {
    if (loading) return <Spinner />;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Product Waitlists Details</h2>
            <div className="space-y-4">
                {products.map((product) => (
                    <div key={product.product_id} className="border-2 border-neutral-300 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="relative w-20 h-20 rounded-md overflow-hidden">
                                    <img
                                        src={product.product_image}
                                        alt={product.product_title}
                                        // fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{product.product_title}</h3>
                                    <div className="flex items-center space-x-4 mt-2">
                                        <span className="text-sm text-neutral-500">
                                            Waitlist: <span className="font-bold">{product.waitlist_count}</span>
                                        </span>
                                        <span className="text-sm text-neutral-500">
                                            Stock: <span className="font-bold">{product.inventory_quantity}</span>
                                        </span>
                                        {product.is_available ? (
                                            <span className="text-sm text-green-600 font-semibold">Available</span>
                                        ) : (
                                            <span className="text-sm text-red-600 font-semibold">Out of Stock</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onViewWaitlist(product)}
                                className="cursor-pointer bg-yellow-400 hover:bg-yellow-600 text-white px-6 py-2 rounded-md transition-colors"
                            >
                                View Waitlist
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
