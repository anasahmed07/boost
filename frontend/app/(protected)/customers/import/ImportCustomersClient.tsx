"use client";

import React, { useState, useCallback } from 'react';
import { Upload, Check, Download, AlertCircle, Settings } from 'lucide-react';

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

// Define the structure of transformed customer data to match your schema
interface TransformedCustomer {
	phone_number?: string;
	customer_name?: string;
	email?: string;
	customer_type?: string;
	company_name?: string;
	address?: string;
	total_spend?: number;
	is_active?: boolean;
	escalation_status?: boolean;
	cart_id?: string;
	customer_quickbook_id?: string;
	interest_groups?: [];
	tags?: string;
	_originalRow?: number;
}

// Define your API fields to match the database schema
const API_FIELDS: ApiField[] = [
	{ key: 'phone_number', label: 'Phone Number', required: true, type: 'phone' },
	{ key: 'customer_type', label: 'Customer Type (B2B/D2C)', required: true, type: 'string', options: ['B2B', 'D2C'] },
	{ key: 'tags', label: 'Tag', required: true, type: 'string' },
	{ key: 'customer_name', label: 'Customer Name', required: false, type: 'string' },
	{ key: 'email', label: 'Email Address', required: false, type: 'email' },
	{ key: 'company_name', label: 'Company Name', required: false, type: 'string' },
	{ key: 'address', label: 'Address', required: false, type: 'string' },
	{ key: 'total_spend', label: 'Total Spend', required: false, type: 'number' },
	{ key: 'is_active', label: 'Is Active', required: false, type: 'boolean' },
	{ key: 'escalation_status', label: 'Escalation Status', required: false, type: 'boolean' },
	{ key: 'cart_id', label: 'Cart ID', required: false, type: 'string' },
	{ key: 'customer_quickbook_id', label: 'QuickBook ID', required: false, type: 'string' },
	{ key: 'interest_groups', label: 'Interest Groups', required: false, type: 'string' },
];

const PageHeading = ({ title, description }: { title: string; description: string }) => (
	<div className="mb-8">
		<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
		<p className="text-gray-600 mt-2">{description}</p>
	</div>
);

export default function CsvUploadMapper() {
	const [csvData, setCsvData] = useState<CsvData | null>(null);
	const [mappings, setMappings] = useState<FieldMapping[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload');

	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const text = e.target?.result as string;

				// Robust CSV parsing function
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

				// Auto-map obvious matches (your existing logic)
				const autoMappings: FieldMapping[] = [];
				API_FIELDS.forEach(apiField => {
					const matchingHeader = headers.find(header =>
						header.toLowerCase().includes(apiField.key.toLowerCase()) ||
						apiField.label.toLowerCase().includes(header.toLowerCase()) ||
						(apiField.key === 'phone_number' && header.toLowerCase().includes('phone')) ||
						(apiField.key === 'customer_name' && header.toLowerCase().includes('name')) ||
						(apiField.key === 'customer_type' && header.toLowerCase().includes('type')) ||
						(apiField.key === 'tags' && (header.toLowerCase().includes('tag') || header.toLowerCase().includes('label')))
					);
					if (matchingHeader) {
						autoMappings.push({
							csvField: matchingHeader,
							apiField: apiField.key,
							type: 'csv'
						});
					}
				});
				setMappings(autoMappings);

			} catch (error) {
				console.log(error);
				setErrors(['Failed to parse CSV file. Please check the format.']);
			}
		};
		reader.readAsText(file);
	}, []);

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

	const transformData = (): TransformedCustomer[] => {
		if (!csvData) return [];

		return csvData.rows.slice(0, 5).map((row, index) => {
			const transformedRow: TransformedCustomer = { _originalRow: index + 1 };

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

				const apiField = API_FIELDS.find(f => f.key === mapping.apiField);

				// Transform based on field type and assign to the proper key
				if (apiField?.type === 'number') {
					(transformedRow as Record<string, unknown>)[mapping.apiField] = value ? parseFloat(value) || 0 : 0;
				} else if (apiField?.type === 'boolean') {
					(transformedRow as Record<string, unknown>)[mapping.apiField] = ['true', '1', 'yes', 'active', 'y'].includes(value.toLowerCase());
				} else {
					(transformedRow as Record<string, unknown>)[mapping.apiField] = value;
				}
			});

			return transformedRow;
		});
	};

	const uploadData = async () => {
		if (!csvData) return;

		setUploading(true);
		try {
			const transformedData: TransformedCustomer[] = csvData.rows.map(row => {
				const transformedRow: TransformedCustomer = {};

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

					const apiField = API_FIELDS.find(f => f.key === mapping.apiField);

					if (apiField?.type === 'number') {
						(transformedRow as Record<string, unknown>)[mapping.apiField] = value ? parseFloat(value) || 0 : 0;
					} else if (apiField?.type === 'boolean') {
						(transformedRow as Record<string, unknown>)[mapping.apiField] = ['true', '1', 'yes', 'active', 'y'].includes(value.toLowerCase());
					} else {
						(transformedRow as Record<string, unknown>)[mapping.apiField] = value;
					}
				});

				return transformedRow;
			});

			// Simulate API call (replace with your actual endpoint)
			// console.log('Data to be sent to API:', transformedData);

			// Replace this with your actual API call
			const response = await fetch('/api/customers/bulk-upload', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ customers: transformedData }),
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
		const csv = `phone_number,customer_type,customer_name,email,address,total_spend,is_active,escalation_status,cart_id,customer_quickbook_id,interest_groups,tags
90897867564,D2C,John Doe,john.doe@example.com,123 Main St,1000,TRUE,FALSE,cart_123,qb_456,,vip
12233445567,D2C,Jane Smith,jane.smith@example.com,456 Oak Ave,1500,TRUE,FALSE,cart_124,qb_457,,premium
9129834764,B2B,Bob Johnson,bob.johnson@company.com,789 Pine St,2000,TRUE,FALSE,cart_125,qb_458,,enterprise
9898787651,D2C,Alice Brown,alice.brown@example.com,321 Elm St,800,TRUE,FALSE,cart_126,qb_459,,regular
12323434566,D2C,Charlie Wilson,charlie.wilson@example.com,654 Maple Dr,1200,TRUE,FALSE,cart_127,qb_460,,new-customer
12309887633,B2B,Diana Davis,diana.davis@business.com,987 Cedar Ln,3000,TRUE,FALSE,cart_128,qb_461,,bulk-buyer
12345609876,D2C,Edward Miller,edward.miller@example.com,147 Birch Rd,950,TRUE,FALSE,cart_129,qb_462,,loyal`;

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'customer_template.csv';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};


	// if (loading) return <PageLoader text={"Loading Dashboard..."}/>

	return (
		<div className="p-8 max-w-6xl mx-auto">
			<PageHeading
				title="Import Customers"
				description="Upload a CSV file and map columns to import customer data into your database"
			/>

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
				<div className="space-y-6">
					<div className="flex justify-center">
						<button
							onClick={downloadTemplate}
							className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-gray-700 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-300"
						>
							<Download size={18} />
							Download CSV Template
						</button>
					</div>

					<div className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-yellow-400 transition-colors">
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
								<p className="text-lg font-medium text-gray-900">Upload your CSV file</p>
								<p className="text-gray-500 mt-1">Click to browse or drag and drop</p>
							</div>
						</label>
					</div>
				</div>
			)}

			{/* Step 2: Field Mapping */}
			{currentStep === 'map' && csvData && (
				<div className="space-y-6">
					<div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
						<h3 className="font-medium text-gray-900 mb-2">CSV Preview</h3>
						<p className="text-sm text-gray-600 mb-3">
							Found {csvData.rows.length} rows with columns: {csvData.headers.join(', ')}
						</p>
					</div>

					<div className="bg-white border border-neutral-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Map CSV Columns to Database Fields</h3>
						<div className="space-y-4">
							{API_FIELDS.map((apiField) => {
								const currentMapping = mappings.find(m => m.apiField === apiField.key);
								return (
									<div key={apiField.key} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center gap-3">
												<div className={`w-3 h-3 rounded-full ${apiField.required ? 'bg-red-500' : 'bg-gray-300'}`} />
												<div>
													<div className="font-medium text-gray-900">{apiField.label}</div>
													<div className="text-sm text-gray-500">
														{apiField.required && 'Required • '}{apiField.type}
														{apiField.options && ` • Options: ${apiField.options.join(', ')}`}
													</div>
												</div>
											</div>
										</div>

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
														className="px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-yellow-500 min-w-48 disabled:bg-gray-100"
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
													{apiField.options ? (
														<select
															value={currentMapping?.type === 'fixed' ? currentMapping.fixedValue || '' : ''}
															onChange={(e) => updateMapping(apiField.key, 'fixed', 'fixed', e.target.value)}
															disabled={currentMapping?.type !== 'fixed'}
															className="px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-yellow-500 min-w-48 disabled:bg-gray-100"
														>
															<option value="">Select value...</option>
															{apiField.options.map((option) => (
																<option key={option} value={option}>
																	{option}
																</option>
															))}
														</select>
													) : (
														<input
															type="text"
															value={currentMapping?.type === 'fixed' ? currentMapping.fixedValue || '' : ''}
															onChange={(e) => updateMapping(apiField.key, 'fixed', 'fixed', e.target.value)}
															disabled={currentMapping?.type !== 'fixed'}
															placeholder={`Enter fixed ${apiField.type} value...`}
															className="px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-yellow-500 min-w-48 disabled:bg-gray-100"
														/>
													)}
												</label>
											</div>
										</div>
									</div>
								);
							})}
						</div>

						<div className="flex justify-between mt-6">
							<button
								onClick={resetUpload}
								className="px-4 py-2 bg-neutral-100 text-gray-700 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-300"
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
					<div className="bg-white border border-neutral-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>
						<p className="text-gray-600 mb-4">
							Preview of the first 5 rows. Total rows to import: {csvData.rows.length}
						</p>

						<div className="overflow-x-auto">
							<table className="w-full border-collapse border border-neutral-200 rounded-lg">
								<thead>
								<tr className="bg-neutral-50">
									{mappings.map((mapping) => {
										const apiField = API_FIELDS.find(f => f.key === mapping.apiField);
										return (
											<th key={mapping.apiField} className="border border-neutral-200 px-3 py-2 text-left font-medium text-gray-900">
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
									<tr key={index} className="hover:bg-neutral-50">
										{mappings.map((mapping) => (
											<td key={mapping.apiField} className="border border-neutral-200 px-3 py-2 text-gray-700">
												{String((row as Record<string, unknown>)[mapping.apiField] || '')}
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
								className="px-4 py-2 bg-neutral-100 text-gray-700 rounded-lg hover:bg-neutral-200 transition-colors border border-neutral-300"
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
										Importing...
									</span>
								) : (
									`Import ${csvData.rows.length} Records`
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Step 4: Success */}
			{currentStep === 'complete' && uploadSuccess && (
				<div className="text-center space-y-6">
					<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<Check className="w-10 h-10 text-green-500" />
					</div>
					<div>
						<h3 className="text-2xl font-semibold text-gray-900 mb-2">Import Successful!</h3>
						<p className="text-gray-600">
							Successfully imported {csvData?.rows.length} customer records to your database.
						</p>
					</div>
					<button
						onClick={resetUpload}
						className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
					>
						Import Another File
					</button>
				</div>
			)}
		</div>
	);
}