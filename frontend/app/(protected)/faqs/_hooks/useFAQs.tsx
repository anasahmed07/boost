import { useState, useEffect, useCallback } from 'react';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    updated_at: string;
    author: string;
}

interface FAQsData {
    faqs: FAQ[];
    total: number;
}

interface NewFAQ {
    question: string;
    answer: string;
}

interface EditingFAQ {
    id: string;
    question: string;
    answer: string;
}

export function useFAQs() {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingFAQ, setEditingFAQ] = useState<EditingFAQ | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUnanswered] = useState(false);

    const isUnanswered = useCallback((faq: FAQ) => {
        return !faq.answer || faq.answer.trim() === '' || faq.answer.toLowerCase() === 'none';
    }, []);

    const fetchFAQs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/faqs/list');

            if (!response.ok) {
                throw new Error('Failed to fetch FAQs');
            }

            const data: FAQsData = await response.json();
            setFaqs(data.faqs || []);
            setTotal(data.faqs.length || 0);
            setFilteredFaqs(data.faqs || []);
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const createFAQ = useCallback(async (newFAQ: NewFAQ) => {
        if (!newFAQ.question.trim()) {
            throw new Error('Question is required');
        }

        try {
            setSaving(true);

            const response = await fetch('/api/faqs/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newFAQ),
            });

            if (!response.ok) {
                throw new Error('Failed to create FAQ');
            }

            await fetchFAQs();
        } catch (error) {
            console.error('Error creating FAQ:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [fetchFAQs]);

    const updateFAQ = useCallback(async (faq: EditingFAQ) => {
        if (!faq.question.trim()) {
            throw new Error('Question is required');
        }

        try {
            setSaving(true);

            const response = await fetch(`/api/faqs/${faq.id}/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: faq.question,
                    answer: faq.answer
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update FAQ');
            }

            await fetchFAQs();
        } catch (error) {
            console.error('Error updating FAQ:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [fetchFAQs]);

    const deleteFAQ = useCallback(async (faq: FAQ) => {
        setDeletingId(faq.id);
        try {
            const response = await fetch(`/api/faqs/${faq.id}/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete FAQ');
            }

            await fetchFAQs();
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            throw error;
        } finally {
            setDeletingId(null);
        }
    }, [fetchFAQs]);

    const startEdit = useCallback((faq: FAQ) => {
        setEditingId(faq.id);
        setEditingFAQ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer
        });
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditingFAQ(null);
    }, []);

    const filterFAQs = useCallback(() => {
        let filtered = faqs;

        if (searchTerm.trim()) {
            filtered = filtered.filter(faq =>
                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterUnanswered) {
            filtered = filtered.filter(isUnanswered);
        }

        setFilteredFaqs(filtered);
    }, [faqs, searchTerm, filterUnanswered, isUnanswered]);

    useEffect(() => {
        fetchFAQs();
    }, [fetchFAQs]);

    useEffect(() => {
        filterFAQs();
    }, [filterFAQs]);

    return {
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
    };
}