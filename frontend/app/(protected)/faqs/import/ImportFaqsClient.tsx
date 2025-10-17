'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {Upload, Check, Download, AlertCircle, Settings, ChevronLeft} from 'lucide-react';
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import Link from "next/link";

interface CsvData {
	headers: string[];
	rows: string[][];
}

interface FieldMapping {
	csvField: string;
	apiField: string;
	type: 'csv' | 'fixed';
	fixedValue?: string;
}

interface ApiField {
	key: string;
	label: string;
	required: boolean;
	type: 'string' | 'number' | 'email' | 'phone' | 'boolean';
	options?: string[];
}

// Define the structure of transformed FAQ data
interface TransformedFaq {
	question?: string;
	answer?: string;
	_originalRow?: number;
}

// Define your API fields for FAQs
const API_FIELDS: ApiField[] = [
	{ key: 'question', label: 'Question', required: true, type: 'string' },
	{ key: 'answer', label: 'Answer', required: true, type: 'string' },
	{ key: 'author', label: 'Author (Uploader)', required: true, type: 'string'}
];

const PageHeading = ({ title, description }: { title: string; description: string }) => (
	<div className="mb-8">
		<h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
		<p className="text-gray-600">{description}</p>
	</div>
);

export default function BulkImportFaqs() {
	const [csvData, setCsvData] = useState<CsvData | null>(null);
	const [mappings, setMappings] = useState<FieldMapping[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload');
	const [userEmail, setUserEmail] = useState<string>('');

	const router = useRouter();

	useEffect(() => {
		const getUserEmail = async () => {
			const supabase = createClient();
			const { data, error } = await supabase.auth.getUser();

			if (error) {
				console.error('Error fetching user:', error);
				setErrors(['Failed to fetch user information']);
				return;
			}

			if (data?.user?.email) {
				setUserEmail(data.user.email);
			}
		};

		getUserEmail();
	}, []);

	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const text = e.target?.result as string;

				// Robust CSV parsing function that handles newlines in quoted fields
				const parseCSV = (csvText: string) => {
					const lines: string[][] = [];
					let currentLine: string[] = [];
					let currentField = '';
					let inQuotes = false;
					let i = 0;

					while (i < csvText.length) {
						const char = csvText[i];
						const nextChar = csvText[i + 1];

						if (char === '"') {
							if (inQuotes && nextChar === '"') {
								// Escaped quote within quoted field
								currentField += '"';
								i += 2;
								continue;
							} else {
								// Toggle quote state
								inQuotes = !inQuotes;
							}
						} else if (char === ',' && !inQuotes) {
							// End of field
							currentLine.push(currentField.trim());
							currentField = '';
						} else if ((char === '\n' || char === '\r') && !inQuotes) {
							// End of line
							if (currentField || currentLine.length > 0) {
								currentLine.push(currentField.trim());
								if (currentLine.some(field => field.length > 0)) {
									lines.push(currentLine);
								}
							}
							currentLine = [];
							currentField = '';

							// Skip \r\n combinations
							if (char === '\r' && nextChar === '\n') {
								i++;
							}
						} else {
							// Regular character (including newlines within quotes)
							currentField += char;
						}
						i++;
					}

					// Handle last field/line
					if (currentField || currentLine.length > 0) {
						currentLine.push(currentField.trim());
						if (currentLine.some(field => field.length > 0)) {
							lines.push(currentLine);
						}
					}

					return lines;
				};

				const parsedLines = parseCSV(text);

				if (parsedLines.length < 2) {
					setErrors(['CSV file must contain at least a header row and one data row']);
					return;
				}

				// Clean headers (remove extra quotes and whitespace)
				const headers = parsedLines[0].map(h => h.replace(/^["']|["']$/g, '').trim());

				// Process data rows
				const rows = parsedLines.slice(1).map(line =>
					line.map(cell => cell.replace(/^["']|["']$/g, '').trim())
				);

				setCsvData({ headers, rows });
				setCurrentStep('map');
				setErrors([]);

				// Auto-map obvious matches and set author to fixed
				const autoMappings: FieldMapping[] = [];
				API_FIELDS.forEach(apiField => {
					if (apiField.key === 'author') {
						// Always set author as fixed value with user's email
						autoMappings.push({
							csvField: '',
							apiField: 'author',
							type: 'fixed',
							fixedValue: userEmail
						});
					} else {
						const matchingHeader = headers.find(header =>
							header.toLowerCase().includes(apiField.key.toLowerCase()) ||
							apiField.label.toLowerCase().includes(header.toLowerCase())
						);
						if (matchingHeader) {
							autoMappings.push({
								csvField: matchingHeader,
								apiField: apiField.key,
								type: 'csv'
							});
						}
					}
				});
				setMappings(autoMappings);

			} catch (error) {
				console.log(error);
				setErrors(['Failed to parse CSV file. Please check the format.']);
			}
		};
		reader.readAsText(file);
	}, [userEmail]);


	const updateMapping = (apiField: string, mappingType: 'csv' | 'fixed', value: string, fixedValue?: string) => {
		setMappings(prev => {
			const filtered = prev.filter(m => m.apiField !== apiField);
			if (value && value !== 'unmapped') {
				if (mappingType === 'csv') {
					filtered.push({ csvField: value, apiField, type: 'csv' });
				} else {
					filtered.push({ csvField: '', apiField, type: 'fixed', fixedValue });
				}
			}
			return filtered;
		});
	};

	const validateMappings = () => {
		const newErrors: string[] = [];
		const requiredFields = API_FIELDS.filter(f => f.required);

		requiredFields.forEach(field => {
			const mapping = mappings.find(m => m.apiField === field.key);
			if (!mapping) {
				newErrors.push(`Required field "${field.label}" is not mapped`);
			} else if (mapping.type === 'fixed' && !mapping.fixedValue) {
				newErrors.push(`Fixed value for "${field.label}" cannot be empty`);
			}
		});

		setErrors(newErrors);
		return newErrors.length === 0;
	};

	const previewData = () => {
		if (!validateMappings()) return;
		setCurrentStep('preview');
	};

	const transformData = (): TransformedFaq[] => {
		if (!csvData) return [];

		return csvData.rows.slice(0, 5).map((row, index) => {
			const transformedRow: TransformedFaq = { _originalRow: index + 1 };

			mappings.forEach(mapping => {
				let value = '';

				if (mapping.type === 'fixed') {
					value = mapping.fixedValue || '';
				} else {
					const csvIndex = csvData.headers.indexOf(mapping.csvField);
					if (csvIndex >= 0) {
						value = row[csvIndex] || '';
					}
				}

				// Transform based on field type and assign to the proper key
				(transformedRow as Record<string, unknown>)[mapping.apiField] = value;
			});

			return transformedRow;
		});
	};

	const uploadData = async () => {
		if (!csvData) return;

		setUploading(true);
		try {
			const transformedData: TransformedFaq[] = csvData.rows.map(row => {
				const transformedRow: TransformedFaq = {};

				mappings.forEach(mapping => {
					let value = '';

					if (mapping.type === 'fixed') {
						value = mapping.fixedValue || '';
					} else {
						const csvIndex = csvData.headers.indexOf(mapping.csvField);
						if (csvIndex >= 0) {
							value = row[csvIndex] || '';
						}
					}

					(transformedRow as Record<string, unknown>)[mapping.apiField] = value;
				});

				return transformedRow;
			});

			// API call to your FAQ bulk import endpoint
			const response = await fetch('/api/faqs/bulk-import', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ faqs: transformedData }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.log(errorData)
				throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
			}

			setUploadSuccess(true);
			setCurrentStep('complete');
		} catch (error) {
			console.error('Upload error:', error);
			setErrors([`Failed to upload data: ${error instanceof Error ? error.message : 'Unknown error'}`]);
		} finally {
			setUploading(false);
		}
	};

	const resetUpload = () => {
		setCsvData(null);
		setMappings([]);
		setUploadSuccess(false);
		setErrors([]);
		setCurrentStep('upload');
	};

	const downloadTemplate = () => {
		const headers = API_FIELDS.map(f => f.key).join(',');
		const sampleRow = API_FIELDS.map(f => {
			switch (f.key) {
				case 'question': return 'What is your return policy?';
				case 'answer': return 'We offer a 30-day return policy for all items in their original condition.';
				default: return `Sample ${f.label}`;
			}
		}).join(',');

		const csv = `${headers}\n${sampleRow}`;
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'faqs_template.csv';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	return (
		<div className="p-6 bg-gray-50 min-h-screen">
			<div className="flex gap-8 items-start ">
				<button
					onClick={() => {router.back()}}
					className={"p-2 rounded-md hover:bg-neutral-200 duration-150 cursor-pointer"}
				>
					<ChevronLeft/>
				</button>
				<PageHeading
					title="Bulk Import FAQs"
					description="Upload a CSV file to import frequently asked questions and answers"
				/>
			</div>

			<div className="flex gap-2 border rounded-md border-yellow-500 p-3 text-yellow-700 bg-yellow-100 mb-4 items-center">
				<span className={"font-bold"}>Attention: </span>
				<span>It is very important that before uploading FAQs, you read the comprehensive <Link href={"/guide/faqs"} className={"text-blue-400"}>FAQs Guide</Link>. This will help prevent unnecessary bugs.</span>
			</div>

			{/* Progress Steps */}
			<div className="flex items-center justify-center mb-8">
				<div className="flex items-center space-x-4">
					{['upload', 'map', 'preview', 'complete'].map((step, index) => (
						<React.Fragment key={step}>
							<div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold text-sm ${
								currentStep === step
									? 'bg-yellow-500 text-white border-yellow-500'
									: index < ['upload', 'map', 'preview', 'complete'].indexOf(currentStep)
										? 'bg-green-500 text-white border-green-500'
										: 'bg-gray-100 text-gray-500 border-gray-300'
							}`}>
								{index < ['upload', 'map', 'preview', 'complete'].indexOf(currentStep) ? (
									<Check size={16} />
								) : (
									index + 1
								)}
							</div>
							{index < 3 && (
								<div className={`w-12 h-0.5 ${
									index < ['upload', 'map', 'preview', 'complete'].indexOf(currentStep)
										? 'bg-green-500'
										: 'bg-gray-300'
								}`} />
							)}
						</React.Fragment>
					))}
				</div>
			</div>

			{/* Error Display */}
			{errors.length > 0 && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center gap-2 text-red-800 font-medium mb-2">
						<AlertCircle size={20} />
						<span>Please fix the following issues:</span>
					</div>
					<ul className="list-disc list-inside text-red-700 space-y-1">
						{errors.map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</div>
			)}

			{/* Step 1: File Upload */}
			{currentStep === 'upload' && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="text-center space-y-6">
						<div className="flex justify-center">
							<button
								onClick={downloadTemplate}
								className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
							>
								<Download size={18} />
								Download CSV Template
							</button>
						</div>

						<div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-yellow-400 transition-colors">
							<input
								type="file"
								accept=".csv"
								onChange={handleFileUpload}
								className="hidden"
								id="csv-upload"
							/>
							<label
								htmlFor="csv-upload"
								className="cursor-pointer flex flex-col items-center gap-4"
							>
								<div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
									<Upload className="w-8 h-8 text-yellow-500" />
								</div>
								<div>
									<p className="text-lg font-medium text-gray-900">Upload your FAQ CSV file</p>
									<p className="text-gray-500 mt-1">Click to browse or drag and drop</p>
									<p className="text-sm text-gray-400 mt-2">CSV should contain Question and Answer columns</p>
								</div>
							</label>
						</div>
					</div>
				</div>
			)}

			{/* Step 2: Field Mapping */}
			{currentStep === 'map' && csvData && (
				<div className="space-y-6">
					<div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
						<h3 className="font-medium text-gray-900 mb-2">CSV Preview</h3>
						<p className="text-sm text-gray-600 mb-3">
							Found {csvData.rows.length} rows with columns: {csvData.headers.join(', ')}
						</p>
					</div>

					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Map CSV Columns to FAQ Fields</h3>
						<div className="space-y-4">
							{API_FIELDS.map((apiField) => {
								const currentMapping = mappings.find(m => m.apiField === apiField.key);
								const isAuthorField = apiField.key === 'author';

								return (
									<div key={apiField.key} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center gap-3">
												<div className={`w-3 h-3 rounded-full ${apiField.required ? 'bg-red-500' : 'bg-gray-300'}`} />
												<div>
													<div className="font-medium text-gray-900">{apiField.label}</div>
													<div className="text-sm text-gray-500">
														{apiField.required && 'Required • '}{apiField.type}
													</div>
												</div>
											</div>
										</div>

										{isAuthorField ? (
											// Author field is always fixed
											<div className="flex items-center gap-3 p-3 bg-yellow-50 rounded border border-yellow-200">
												<Settings size={16} className="text-yellow-600" />
												<span className="text-sm font-medium text-gray-700">Fixed value (current user):</span>
												<input
													type="text"
													value={userEmail}
													disabled
													className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 min-w-48"
												/>
											</div>
										) : (
											<div className="space-y-3">
												{/* CSV Column Mapping Option */}
												<div className="flex items-center gap-3">
													<input
														type="radio"
														id={`${apiField.key}-csv`}
														name={apiField.key}
														checked={currentMapping?.type === 'csv' || (!currentMapping && true)}
														onChange={() => {
															const existingCsvField = currentMapping?.type === 'csv' ? currentMapping.csvField : '';
															updateMapping(apiField.key, 'csv', existingCsvField || 'unmapped');
														}}
														className="w-4 h-4 text-yellow-500 focus:ring-yellow-400"
													/>
													<label htmlFor={`${apiField.key}-csv`} className="flex items-center gap-2 flex-1">
														<span className="text-sm font-medium text-gray-700">Map from CSV column:</span>
														<select
															value={currentMapping?.type === 'csv' ? currentMapping.csvField : 'unmapped'}
															onChange={(e) => updateMapping(apiField.key, 'csv', e.target.value)}
															disabled={currentMapping?.type !== 'csv' && currentMapping !== undefined}
															className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-yellow-500 min-w-48 disabled:bg-gray-100"
														>
															<option value="unmapped">Select CSV column...</option>
															{csvData.headers.map((header) => (
																<option key={header} value={header}>
																	{header}
																</option>
															))}
														</select>
													</label>
												</div>

												{/* Fixed Value Option */}
												<div className="flex items-center gap-3">
													<input
														type="radio"
														id={`${apiField.key}-fixed`}
														name={apiField.key}
														checked={currentMapping?.type === 'fixed'}
														onChange={() => updateMapping(apiField.key, 'fixed', 'fixed', '')}
														className="w-4 h-4 text-yellow-500 focus:ring-yellow-400"
													/>
													<label htmlFor={`${apiField.key}-fixed`} className="flex items-center gap-2 flex-1">
														<Settings size={16} className="text-gray-500" />
														<span className="text-sm font-medium text-gray-700">Use fixed value:</span>
														<input
															type="text"
															value={currentMapping?.type === 'fixed' ? currentMapping.fixedValue || '' : ''}
															onChange={(e) => updateMapping(apiField.key, 'fixed', 'fixed', e.target.value)}
															disabled={currentMapping?.type !== 'fixed'}
															placeholder={`Enter fixed ${apiField.type} value...`}
															className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-yellow-500 min-w-48 disabled:bg-gray-100"
														/>
													</label>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						<div className="flex justify-between mt-6">
							<button
								onClick={resetUpload}
								className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
							>
								Start Over
							</button>
							<button
								onClick={previewData}
								className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
							>
								Preview Data
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Step 3: Data Preview */}
			{currentStep === 'preview' && csvData && (
				<div className="space-y-6">
					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">FAQ Data Preview</h3>
						<p className="text-gray-600 mb-4">
							Preview of the first 5 rows. Total FAQs to import: {csvData.rows.length}
						</p>

						<div className="overflow-x-auto">
							<table className="w-full border-collapse border border-gray-200 rounded-lg">
								<thead>
								<tr className="bg-gray-50">
									{mappings.map((mapping) => {
										const apiField = API_FIELDS.find(f => f.key === mapping.apiField);
										return (
											<th key={mapping.apiField} className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-900">
												{apiField?.label}
												{mapping.type === 'fixed' && (
													<span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
														Fixed
													</span>
												)}
											</th>
										);
									})}
								</tr>
								</thead>
								<tbody>
								{transformData().map((row, index) => (
									<tr key={index} className="hover:bg-gray-50">
										{mappings.map((mapping) => (
											<td key={mapping.apiField} className="border border-gray-200 px-3 py-2 text-gray-700 max-w-md">
												<div className="truncate" title={String((row as Record<string, unknown>)[mapping.apiField] || '')}>
													{String((row as Record<string, unknown>)[mapping.apiField] || '')}
												</div>
											</td>
										))}
									</tr>
								))}
								</tbody>
							</table>
						</div>

						<div className="flex justify-between mt-6">
							<button
								onClick={() => setCurrentStep('map')}
								className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
							>
								Back to Mapping
							</button>
							<button
								onClick={uploadData}
								disabled={uploading}
								className={`px-6 py-2 rounded-lg font-medium transition-colors ${
									uploading
										? 'bg-gray-400 text-white cursor-not-allowed'
										: 'bg-green-500 text-white hover:bg-green-600'
								}`}
							>
								{uploading ? (
									<span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing FAQs...
                  </span>
								) : (
									`Import ${csvData.rows.length} FAQs`
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Step 4: Success */}
			{currentStep === 'complete' && uploadSuccess && (
				<div className="bg-white rounded-lg shadow p-8">
					<div className="text-center space-y-6">
						<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
							<Check className="w-10 h-10 text-green-500" />
						</div>
						<div>
							<h3 className="text-2xl font-semibold text-gray-900 mb-2">Import Successful!</h3>
							<p className="text-gray-600">
								Successfully imported {csvData?.rows.length} FAQ entries to your database.
							</p>
						</div>
						<button
							onClick={resetUpload}
							className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
						>
							Import Another File
						</button>
					</div>
				</div>
			)}

			{/* Statistics Cards */}
			<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white rounded-lg shadow p-4">
					<div className="flex items-center">
						<div className="p-2 bg-yellow-100 rounded-lg">
							<svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-gray-500">CSV Template</p>
							<p className="text-lg font-bold text-gray-900">Question, Answer</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow p-4">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-gray-500">Current Status</p>
							<p className="text-lg font-bold text-gray-900">
								{currentStep === 'complete' ? 'Import Complete' : 'Ready to Import'}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}