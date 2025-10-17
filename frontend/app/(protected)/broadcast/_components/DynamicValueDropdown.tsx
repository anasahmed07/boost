"use client";

import React, { useState, useRef } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

export interface DynamicValuesResponse {
    frontend_payload: {
        campaign_id?: string;
        to: string[];
        variables: Array<{
            name: string;
            value: string;
        }>;
    };
    dynamic_values: string[];
    route: string;
}

interface TemplateVariable {
    name: string;
    type: string;
    example: string;
}

const DynamicValueDropdown: React.FC<{
    uniqueKey: string;
    value: string;
    variable: TemplateVariable;
    dynamicValues: string[];
    onChange: (uniqueKey: string, value: string) => void;
}> = ({ uniqueKey, value, variable, dynamicValues, onChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleInsertDynamic = (dynamicValue: string) => {
        const input = inputRef.current;
        if (!input) return;

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;

        // Insert dynamic value at cursor position
        const newValue = value.substring(0, start) + dynamicValue + value.substring(end);
        onChange(uniqueKey, newValue);

        setShowDropdown(false);

        // Set cursor position after inserted value
        setTimeout(() => {
            input.focus();
            const newPosition = start + dynamicValue.length;
            input.setSelectionRange(newPosition, newPosition);
        }, 0);
    };

    const hasDynamicValue = value.includes('$dynamic_');

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                    {variable.name}
                </span>
                <span className="text-gray-500">({variable.type})</span>
            </label>

            <div className="relative">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={`e.g., ${variable.example}`}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                hasDynamicValue
                                    ? 'pr-10 border-purple-300 focus:ring-purple-500 focus:border-purple-500'
                                    : 'border-gray-300'
                            }`}
                            value={value}
                            onChange={(e) => onChange(uniqueKey, e.target.value)}
                        />
                        {hasDynamicValue && (
                            <Sparkles
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-500"
                                size={18}
                            />
                        )}
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                            title="Insert dynamic value"
                        >
                            <Sparkles size={16} />
                            <span className="text-sm font-medium">Insert</span>
                            <ChevronDown
                                size={16}
                                className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {showDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowDropdown(false)}
                                />
                                <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                                    <div className="p-3 bg-purple-50 border-b border-purple-200">
                                        <p className="text-xs font-semibold text-purple-900 mb-1">
                                            Insert Dynamic Value
                                        </p>
                                        <p className="text-xs text-purple-700">
                                            Click to insert at cursor position
                                        </p>
                                    </div>
                                    {dynamicValues.map((dynamicValue) => (
                                        <button
                                            key={dynamicValue}
                                            onClick={() => handleInsertDynamic(dynamicValue)}
                                            className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors group"
                                        >
                                            <div className="flex items-start gap-2">
                                                <Sparkles className="text-purple-500 mt-0.5 flex-shrink-0" size={14} />
                                                <div className="flex-1">
                                                    <span className="font-mono text-sm text-purple-700 group-hover:text-purple-900 block">
                                                        {dynamicValue}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {dynamicValue.replace('$dynamic_', '').replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {hasDynamicValue && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-700 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-purple-500" />
                            <span className="font-medium">Dynamic values detected:</span>
                            <span>These will be populated automatically for each recipient</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DynamicValueDropdown;