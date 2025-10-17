"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import PageLoader from "@/components/ui/PageLoader";
import FAQHeader from './_components/FAQHeader';
import FAQSearchFilter from './_components/FAQSearchFilter';
import FAQStats from './_components/FAQStats';
import FAQAddForm from './_components/FAQAddForm';
import FAQItem from './_components/FAQItem';
import FAQEditForm from './_components/FAQEditForm';
import FAQEmptyState from './_components/FAQEmptyState';
import { useFAQs } from './_hooks/useFAQs';

interface FAQ {
	id: string;
	question: string;
	answer: string;
	updated_at: string;
	author: string;
}

interface ToastState {
	show: boolean;
	message: string;
	type: 'success' | 'error';
}

interface NewFAQ {
	question: string;
	answer: string;
}


export default function FAQsManager() {
	const {
		faqs,
		filteredFaqs,
		total,
		loading,
		saving,
		editingId,
		editingFAQ,
		deletingId,
		searchTerm,
		setSearchTerm,
		setEditingFAQ,
		fetchFAQs,
		createFAQ,
		updateFAQ,
		deleteFAQ,
		startEdit,
		cancelEdit,
		isUnanswered
	} = useFAQs();

	const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
	const [showAddForm, setShowAddForm] = useState(false);
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
	const [newFAQ, setNewFAQ] = useState<NewFAQ>({
		question: '',
		answer: '',
	});
	const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		setToast({ show: true, message, type });
	};

	const hideToast = () => {
		setToast(prev => ({ ...prev, show: false }));
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (activeDropdown !== null) {
				const dropdownElement = dropdownRefs.current[activeDropdown];
				if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
					setActiveDropdown(null);
				}
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [activeDropdown]);

	const handleCreateFAQ = async () => {
		try {
			await createFAQ(newFAQ);
			setNewFAQ({ question: '', answer: '' });
			setShowAddForm(false);
			showToast('FAQ created successfully', 'success');
		} catch (error) {
			console.log(error);
			showToast('Failed to create FAQ', 'error');
		}
	};

	const handleUpdateFAQ = async () => {
		if (!editingFAQ) return;

		try {
			await updateFAQ(editingFAQ);
			cancelEdit();
			showToast('FAQ updated successfully', 'success');
		} catch (error) {
			console.log(error);
			showToast('Failed to update FAQ', 'error');
		}
	};

	const handleDeleteFAQ = async (faq: FAQ) => {
		if (!confirm(`Are you sure you want to delete this FAQ?\n\nQuestion: ${faq.question}\n\nThis action cannot be undone.`)) {
			return;
		}

		try {
			await deleteFAQ(faq);
			showToast('FAQ deleted successfully', 'success');
			setActiveDropdown(null);
		} catch (error) {
			console.log(error);
			showToast('Failed to delete FAQ', 'error');
		}
	};

	const handleToggleDropdown = (faqId: string) => {
		setActiveDropdown(activeDropdown === faqId ? null : faqId);
	};

	const handleUpdateNewFAQ = (field: 'question' | 'answer', value: string) => {
		setNewFAQ(prev => ({ ...prev, [field]: value }));
	};

	const handleUpdateEditingFAQ = (field: 'question' | 'answer', value: string) => {
		setEditingFAQ(prev => prev ? { ...prev, [field]: value } : null);
	};

	if (loading) {
		return <PageLoader text="Loading FAQs..." />;
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<FAQHeader onAddClick={() => setShowAddForm(!showAddForm)} />

					{/* Search and Filter */}
					<FAQSearchFilter
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
					/>

					{/* Stats */}
					<FAQStats total={total} />
				</div>

				{/* Add FAQ Form */}
				{showAddForm && (
					<FAQAddForm
						newFAQ={newFAQ}
						saving={saving}
						onUpdate={handleUpdateNewFAQ}
						onCreate={handleCreateFAQ}
						onCancel={() => setShowAddForm(false)}
					/>
				)}

				{/* FAQs List */}
				<div className="space-y-4">
					{filteredFaqs.length === 0 ? (
						<FAQEmptyState hasAnyFAQs={faqs.length > 0} />
					) : (
						filteredFaqs.map((faq) => (
							<div key={faq.id}>
								{editingId === faq.id && editingFAQ ? (
									<div className="bg-white rounded-lg shadow-sm border p-6">
										<FAQEditForm
											editingFAQ={editingFAQ}
											saving={saving}
											onUpdate={handleUpdateEditingFAQ}
											onSave={handleUpdateFAQ}
											onCancel={cancelEdit}
										/>
									</div>
								) : (
									<FAQItem
										faq={faq}
										isUnanswered={isUnanswered(faq)}
										activeDropdown={activeDropdown}
										deletingId={deletingId}
										onEdit={() => startEdit(faq)}
										onDelete={() => handleDeleteFAQ(faq)}
										onToggleDropdown={() => handleToggleDropdown(faq.id)}
									/>
								)}
							</div>
						))
					)}
				</div>

				{/* Refresh Button */}
				<div className="mt-8 flex justify-center">
					<button
						onClick={fetchFAQs}
						disabled={loading}
						className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					>
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
						Refresh FAQs
					</button>
				</div>
			</div>

			{/* Toast */}
			{toast.show && (
				<Toast
					message={toast.message}
					type={toast.type}
					show={toast.show}
					onClose={hideToast}
				/>
			)}
		</div>
	);
}