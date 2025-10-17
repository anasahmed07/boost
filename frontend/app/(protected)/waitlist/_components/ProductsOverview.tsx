"use client";

// I was right

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
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

interface ProductsOverviewProps {
    products: Product[];
    loading: boolean;
}

export const ProductsOverview: React.FC<ProductsOverviewProps> = ({ products, loading }) => {
    if (loading) return <Spinner/>;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">All Products in Waitlist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <div key={product.product_id} className="border-2 border-neutral-200 rounded-lg p-4 hover:shadow-xl transition-shadow bg-white">
                        <div className="relative w-full h-48 mb-4 rounded-md overflow-hidden">
                            <img
                                src={product.product_image}
                                alt={product.product_title}
                                // fill
                                className="object-cover"
                            />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{product.product_title}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Waitlist Count:</span>
                                <span className="font-bold">{product.waitlist_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Inventory:</span>
                                <span className="font-bold">{product.inventory_quantity}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Available:</span>
                                {product.is_available ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                )}
                            </div>
                        </div>
                        <a
                            href={product.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 block text-center bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-md transition-colors"
                        >
                            View Product
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};
