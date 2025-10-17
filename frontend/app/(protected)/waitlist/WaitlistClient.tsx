"use client";

import React, { useState, useEffect } from 'react';
import { Users, Package, Clock } from 'lucide-react';
import { ProductsOverview } from './_components/ProductsOverview';
import { CustomersTab } from './_components/CustomersTab';
import { ProductWaitlistsTab } from './_components/ProductWaitlistsTab';
import { ProductModal } from './_components/ProductModal';
import { CustomerModal } from './_components/CustomerModal';

interface ByProductEntry {
    id: string;
    product_id: string;
    customer_phone: string;
    customer_name: string;
    created_at: string;
    notified: boolean;
}

interface ByProduct {
    entries: ByProductEntry[];
    total: number;
}

interface ByCustomerEntry {
    id: string;
    product_id: string;
    customer_phone: string;
    customer_name: string;
    created_at: string;
    notified: boolean;
}

interface ByCustomer {
    entries: ByCustomerEntry[];
    total: number;
}

interface WaitedProduct {
    product_id: string;
    product_title: string;
    product_image: string;
    product_url: string;
    waitlist_count: number;
    is_available: boolean;
    inventory_quantity: number;
}

interface WaitedProducts {
    products: WaitedProduct[];
    total: number;
}

interface Customer {
    phone: string;
    name: string;
    productCount: number;
    notified: boolean;
}

const WaitlistDashboard = () => {
    const [activeTab, setActiveTab] = useState<string>('products');
    const [products, setProducts] = useState<WaitedProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<WaitedProduct | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [productWaitlist, setProductWaitlist] = useState<ByProductEntry[]>([]);
    const [customerWaitlist, setCustomerWaitlist] = useState<ByCustomerEntry[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showProductModal, setShowProductModal] = useState<boolean>(false);
    const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);

    useEffect(() => {
        if (activeTab === 'products' || activeTab === 'product-details') {
            fetchProducts();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'customers') {
            fetchAllCustomers();
        }
    }, [activeTab]);

    const fetchProducts = async (): Promise<void> => {
        setLoading(true);
        try {
            const response = await fetch('/api/waitlist/products');
            const data: WaitedProducts = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
        setLoading(false);
    };

    const fetchAllCustomers = async (): Promise<void> => {
        setLoading(true);
        try {
            const response = await fetch('/api/waitlist/products');
            const data: WaitedProducts = await response.json();
            console.log(data)
            const customerMap = new Map<string, Customer>();

            for (const product of data.products || []) {
                const waitlistResponse = await fetch(`/api/waitlist/by/product/${product.product_id}`);
                const waitlistData: ByProduct = await waitlistResponse.json();

                waitlistData.entries?.forEach((entry: ByProductEntry) => {
                    if (!customerMap.has(entry.customer_phone)) {
                        customerMap.set(entry.customer_phone, {
                            phone: entry.customer_phone,
                            name: entry.customer_name,
                            productCount: 1,
                            notified: entry.notified
                        });
                    } else {
                        const existing = customerMap.get(entry.customer_phone);
                        if (existing) {
                            existing.productCount += 1;
                        }
                    }
                });
            }

            setCustomers(Array.from(customerMap.values()));
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
        setLoading(false);
    };

    const fetchProductWaitlist = async (productId: string): Promise<void> => {
        setLoading(true);
        try {
            const response = await fetch(`/api/waitlist/by/product/${productId}`);
            const data: ByProduct = await response.json();
            setProductWaitlist(data.entries || []);
        } catch (error) {
            console.error('Error fetching product waitlist:', error);
        }
        setLoading(false);
    };

    const fetchCustomerWaitlist = async (phone: string): Promise<void> => {
        setLoading(true);
        try {
            const response = await fetch(`/api/waitlist/by/customer/${phone}`);
            const data: ByCustomer = await response.json();
            setCustomerWaitlist(data.entries || []);
        } catch (error) {
            console.error('Error fetching customer waitlist:', error);
        }
        setLoading(false);
    };

    const openProductModal = async (product: WaitedProduct): Promise<void> => {
        setSelectedProduct(product);
        setShowProductModal(true);
        await fetchProductWaitlist(product.product_id);
    };

    const openCustomerModal = async (customer: Customer): Promise<void> => {
        setSelectedCustomer(customer);
        setShowCustomerModal(true);
        await fetchCustomerWaitlist(customer.phone);
    };

    return (
        <div className="flex min-h-screen bg-white w-full justify-center">
            <div className="flex flex-col container w-full px-4 py-8 flex-1">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Waitlist Management</h1>
                    <p className="text-neutral-500">Monitor and manage product waitlists and customer notifications</p>
                </div>

                <div className="flex space-x-1 mb-6 border border-neutral-300 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`cursor-pointer flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                            activeTab === 'products'
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'hover:bg-yellow-300'
                        }`}
                    >
                        <Package className="inline-block w-5 h-5 mr-2" />
                        Products Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('customers')}
                        className={`cursor-pointer flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                            activeTab === 'customers'
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'hover:bg-yellow-300'
                        }`}
                    >
                        <Users className="inline-block w-5 h-5 mr-2" />
                        Customers
                    </button>
                    <button
                        onClick={() => setActiveTab('product-details')}
                        className={`cursor-pointer flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                            activeTab === 'product-details'
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'hover:bg-yellow-300'
                        }`}
                    >
                        <Clock className="inline-block w-5 h-5 mr-2" />
                        Product Waitlists
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    {activeTab === 'products' && (
                        <ProductsOverview products={products} loading={loading} />
                    )}

                    {activeTab === 'customers' && (
                        <CustomersTab
                            customers={customers}
                            loading={loading}
                            onViewDetails={openCustomerModal}
                        />
                    )}

                    {activeTab === 'product-details' && (
                        <ProductWaitlistsTab
                            products={products}
                            loading={loading}
                            onViewWaitlist={openProductModal}
                        />
                    )}
                </div>

                {showProductModal && selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        entries={productWaitlist}
                        loading={loading}
                        onClose={() => setShowProductModal(false)}
                    />
                )}

                {showCustomerModal && selectedCustomer && (
                    <CustomerModal
                        customer={selectedCustomer}
                        entries={customerWaitlist}
                        products={products}
                        loading={loading}
                        onClose={() => setShowCustomerModal(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default WaitlistDashboard;