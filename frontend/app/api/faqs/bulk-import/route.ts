// app/api/faqs/bulk-import/route.ts

import { NextRequest, NextResponse } from 'next/server';

interface FaqData {
	question?: string;
	answer?: string;
	author?: string;
	_originalRow?: number;
}

interface BulkImportRequest {
	faqs: FaqData[];
}

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const body: BulkImportRequest = await request.json();

		// Validate that faqs array exists
		if (!body.faqs || !Array.isArray(body.faqs)) {
			return NextResponse.json(
				{ error: 'Invalid request: faqs array is required' },
				{ status: 400 }
			);
		}

		// Validate that we have at least one FAQ
		if (body.faqs.length === 0) {
			return NextResponse.json(
				{ error: 'No FAQs provided for import' },
				{ status: 400 }
			);
		}

		// Validate each FAQ entry
		const invalidFaqs: number[] = [];
		const validFaqs: FaqData[] = [];

		body.faqs.forEach((faq, index) => {
			// Check if required fields are present and not empty
			if (!faq.question || !faq.answer || !faq.author ||
				faq.question.trim() === '' || faq.answer.trim() === '') {
				invalidFaqs.push(index + 1);
			} else {
				// Clean up the data
				validFaqs.push({
					question: faq.question.trim(),
					answer: faq.answer.trim(),
					author: faq.author.trim(),
					_originalRow: faq._originalRow
				});
			}
		});

		// If there are invalid FAQs, return an error
		if (invalidFaqs.length > 0) {
			return NextResponse.json(
				{
					error: `Invalid FAQ entries found at rows: ${invalidFaqs.join(', ')}. Both question and answer are required.`,
					invalidRows: invalidFaqs
				},
				{ status: 400 }
			);
		}

		// Log the start of import process
		console.log('🚀 Starting FAQ Bulk Import Process');
		console.log('📊 Import Statistics:');
		console.log(`   - Total FAQs to import: ${validFaqs.length}`);
		console.log(`   - Request timestamp: ${new Date().toISOString()}`);
		// Convert JSON back to CSV format for external API
		const csvContent = convertJsonToCsv(validFaqs);

		console.log('📄 Generated CSV for External API');
		console.log(`   - CSV size: ${csvContent.length} characters`);
		console.log(`   - CSV rows: ${validFaqs.length + 1} (including header)`);

		// Send CSV to external API
		console.log('🌐 Sending CSV to external API...');

		const serverBaseUri = process.env.SERVER_BASE_URL;
		if (!serverBaseUri) {
			throw new Error('SERVER_BASE_URI environment variable is not configured');
		}

		// Create FormData with the CSV file (multipart/form-data)
		const formData = new FormData();
		console.log(csvContent)
		// Create a File object from the CSV content
		const csvFile = new File([csvContent], 'faqs.csv', { type: 'text/csv' });

		// Add the file and filename to form data
		formData.append('file', csvFile);
		formData.append('filename', 'faqs.csv');

		try {
			const externalApiResponse = await fetch(`${serverBaseUri}/upload/faqs`, {
				method: 'POST',
				// Don't set Content-Type header - let the browser set it with boundary
				body: formData,
				headers: {
					'x-api-key': process.env.SERVER_API_KEY ?? "",
				},
			});

			if (!externalApiResponse.ok) {
				const errorText = await externalApiResponse.text();
				console.error('❌ External API Error Response:', errorText);
				throw new Error(`External API error: ${externalApiResponse.status} ${externalApiResponse.statusText} - ${errorText}`);
			}

			const externalResult = await externalApiResponse.text();
			console.log('✅ External API Response:', externalResult);

			// Log completion
			console.log('✅ FAQ Import Process Completed Successfully');
			console.log(`   - Processed ${validFaqs.length} FAQs`);
			console.log(`   - Sent CSV to external API`);
			console.log(`   - Completion timestamp: ${new Date().toISOString()}`);

			// Return success response
			return NextResponse.json(
				{
					success: true,
					message: 'FAQs imported successfully',
					imported: validFaqs.length,
					data: {
						totalProcessed: validFaqs.length,
						csvGenerated: true,
						csvSize: csvContent.length,
						csvRows: validFaqs.length + 1,
						timestamp: new Date().toISOString(),
						externalApiResponse: externalResult,
						// Optionally return the first few FAQs as confirmation
						sample: validFaqs.slice(0, 3).map(faq => ({
							question: faq.question,
							answer: faq.answer?.substring(0, 100) + (faq.answer && faq.answer.length > 100 ? '...' : '')
						}))
					}
				},
				{ status: 200 }
			);

		} catch (apiError) {
			console.error('❌ Failed to send CSV to external API:', apiError);
			return NextResponse.json(
				{
					error: 'Failed to upload FAQs to external service',
					details: process.env.NODE_ENV === 'development' ? apiError : undefined
				},
				{ status: 502 }
			);
		}

	} catch (error) {
		// Log the error
		console.error('❌ FAQ Import Error:', error);

		// Handle different types of errors
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 }
			);
		}

		// Generic error response
		return NextResponse.json(
			{
				error: 'Internal server error occurred during FAQ import',
				details: process.env.NODE_ENV === 'development' ? error : undefined
			},
			{ status: 500 }
		);
	}
}

// Helper function to convert JSON FAQ data back to CSV
function convertJsonToCsv(faqs: FaqData[]): string {
	// Define CSV headers
	const headers = ['question', 'answer'];

	// Create CSV rows
	const csvRows = [
		// Header row
		headers.join(','),
		// Data rows
		...faqs.map(faq => {
			// Escape quotes and wrap in quotes if contains comma or quote
			const escapeCSVField = (field: string): string => {
				if (field.includes(',') || field.includes('"') || field.includes('\n')) {
					// Escape existing quotes by doubling them
					const escaped = field.replace(/"/g, '""');
					return `"${escaped}"`;
				}
				return field;
			};

			return [
				escapeCSVField(faq.question || ''),
				escapeCSVField(faq.answer || ''),
				escapeCSVField(faq.author || '')
			].join(',');
		})
	];

	return csvRows.join('\n');
}

// Handle unsupported HTTP methods
export async function GET() {
	return NextResponse.json(
		{ error: 'Method not allowed. Use POST to import FAQs.' },
		{ status: 405 }
	);
}

export async function PUT() {
	return NextResponse.json(
		{ error: 'Method not allowed. Use POST to import FAQs.' },
		{ status: 405 }
	);
}

export async function DELETE() {
	return NextResponse.json(
		{ error: 'Method not allowed. Use POST to import FAQs.' },
		{ status: 405 }
	);
}