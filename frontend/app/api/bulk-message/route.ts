// app/api/bulk-message/route.ts
import { NextRequest } from 'next/server';

// interface BulkMessageRequest {
// 	phone_numbers: string[];
// 	message: string;
// 	sender?: string;
// }

interface MessageResult {
	phone_number: string;
	success: boolean;
	error?: string;
	data?: string;
}

interface BulkMessageResponse {
	success: boolean;
	total_sent: number;
	total_failed: number;
	results: MessageResult[];
	message?: string;
}

// Send message to a single phone number using your existing chat endpoint
async function sendSingleMessage(phoneNumber: string, content: string, sender: string): Promise<MessageResult> {
	try {


		const res = await fetch(
			`${process.env.SERVER_BASE_URL}/chats/${phoneNumber}/send`,
			{
				method: 'POST',
				headers: {
					accept: 'application/json',
					'x-api-key': process.env.SERVER_API_KEY ?? 'abcd',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content, sender }),
			}
		);


		if (!res.ok) {
			const errorText = await res.text();
			console.error(`Error response for ${phoneNumber}:`, errorText);
			return {
				phone_number: phoneNumber,
				success: false,
				error: `Upstream error (${res.status}): ${res.statusText} - ${errorText}`
			};
		}

		const data = await res.json();

		return {
			phone_number: phoneNumber,
			success: true,
			data: data
		};

	} catch (error) {
		console.error(`Error sending message to ${phoneNumber}:`, error);
		return {
			phone_number: phoneNumber,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

export async function POST(request: NextRequest) {
	try {
		// Destructure directly from the frontend request body
		const { phone_numbers, message, sender = 'representative' } = await request.json();

		// Validate required fields
		if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
			return Response.json(
				{
					success: false,
					message: 'phone_numbers is required and must be a non-empty array'
				},
				{ status: 400 }
			);
		}

		if (!message || typeof message !== 'string' || message.trim().length === 0) {
			return Response.json(
				{
					success: false,
					message: 'message is required and must be a non-empty string'
				},
				{ status: 400 }
			);
		}

		// Limit bulk message size
		if (phone_numbers.length > 100) {
			return Response.json(
				{
					success: false,
					message: 'Maximum 100 phone numbers allowed per request'
				},
				{ status: 400 }
			);
		}


		// Send messages concurrently with controlled concurrency
		const concurrencyLimit = 5; // Send max 5 messages at once
		const results: MessageResult[] = [];

		for (let i = 0; i < phone_numbers.length; i += concurrencyLimit) {
			const batch = phone_numbers.slice(i, i + concurrencyLimit);
			const batchPromises = batch.map(phoneNumber =>
				sendSingleMessage(phoneNumber, message.trim(), sender)
			);

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);

			// Small delay between batches to avoid overwhelming the chat service
			if (i + concurrencyLimit < phone_numbers.length) {
				await new Promise(resolve => setTimeout(resolve, 200));
			}
		}

		// Calculate success/failure counts
		const successCount = results.filter(result => result.success).length;
		const failureCount = results.filter(result => !result.success).length;

		const response: BulkMessageResponse = {
			success: successCount > 0,
			total_sent: successCount,
			total_failed: failureCount,
			results: results,
			message: `Successfully sent ${successCount} messages, ${failureCount} failed`
		};



		// Return appropriate status code
		const statusCode = successCount > 0 ? (failureCount > 0 ? 207 : 200) : 500;

		return Response.json(response, { status: statusCode });

	} catch (error) {
		console.error('Bulk message API error:', error);

		return Response.json(
			{
				success: false,
				message: 'Internal server error occurred while sending messages',
				total_sent: 0,
				total_failed: 0,
				results: []
			},
			{ status: 500 }
		);
	}
}

// Handle unsupported methods
export async function GET() {
	return Response.json(
		{ message: 'Method not allowed. Use POST to send bulk messages.' },
		{ status: 405 }
	);
}

export async function PUT() {
	return Response.json(
		{ message: 'Method not allowed. Use POST to send bulk messages.' },
		{ status: 405 }
	);
}

export async function DELETE() {
	return Response.json(
		{ message: 'Method not allowed. Use POST to send bulk messages.' },
		{ status: 405 }
	);
}