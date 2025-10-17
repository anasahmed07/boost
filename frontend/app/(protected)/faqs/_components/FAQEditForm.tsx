import React from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import Link from "next/link";

interface EditingFAQ {
    id: string;
    question: string;
    answer: string;
}

interface FAQEditFormProps {
    editingFAQ: EditingFAQ;
    saving: boolean;
    onUpdate: (field: 'question' | 'answer', value: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export default function FAQEditForm({
                                        editingFAQ,
                                        saving,
                                        onUpdate,
                                        onSave,
                                        onCancel
                                    }: FAQEditFormProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit FAQ</h3>
                <button
                    onClick={onCancel}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                    </label>
                    <input
                        type="text"
                        value={editingFAQ.question}
                        onChange={(e) => onUpdate('question', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Enter the question..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                    <textarea
                        value={editingFAQ.answer}
                        onChange={(e) => onUpdate('answer', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Enter the answer..."
                    />
                </div>

                <div className="flex flex-col gap-4 border-t py-4 border-neutral-400">
                    <div className="text-xl">Guidelines for uploading FAQs</div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">1. Keep questions clear and specific</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Write questions in simple, straightforward language that a typical customer would ask.</li>
                            <li>Avoid vague or multi-part questions; one question per FAQ entry is ideal.</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">2. Provide precise and helpful answers</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Keep answers concise and to the point, typically 1-3 sentences.</li>
                            <li>Include clear steps, links, or instructions when applicable.</li>
                            <li>Avoid unnecessary or unrelated information.</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">3. Use natural, conversational language</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Write as if you are speaking to a real person and avoid using emojis and special characters.</li>
                            <li>This makes the FAQ easier for anyone to read and understand.</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">4. Include alternative phrasings</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Think of different ways customers might ask the same question.</li>
                            <li>You can include these variations within the answer or as separate entries.</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">5. Keep each FAQ self-contained</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Each entry should make sense on its own without referring to other FAQs.</li>
                            <li>Avoid phrases like “see the other guide for more info.”</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">6. Include product names when relevant</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>If the FAQ is about a specific product, mention the product name in both the question and the answer.</li>
                            <li>This helps customers understand exactly which product the FAQ is about.</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">7. Use proper formatting</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Use bullets, numbered steps, or short paragraphs for clarity.</li>
                            <li>This makes the instructions easier to read and follow.</li>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="font-bold">8. Keep content up-to-date</div>
                        <div className="text-sm text-neutral-600 ml-7">
                            <li>Regularly review FAQs to remove outdated information.</li>
                            <li>Ensure answers remain accurate, especially if products or services change.</li>
                        </div>
                    </div>

                    <div className="flex  gap-2 text-xs text-neutral-400 italic">
                        <span>For further reading and detailed information, see:</span>
                        <Link href={"#"} className={"text-yellow-400 hover:underline duration-200"}>FAQs Guide</Link>
                    </div>

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving || !editingFAQ.question.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {saving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Updating...' : 'Update FAQ'}
                    </button>
                </div>
            </div>
        </div>
    );
}