import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: 'Document ID is required' },
				{ status: 400 }
			);
		}

		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			console.error('SERVER_BASE_URL or SERVER_API_KEY environment variable is not set');
			return NextResponse.json(
				{ error: 'Server configuration error' },
				{ status: 500 }
			);
		}

		// Call the backend API to delete the Document
		const response = await fetch(`${SERVER_BASE_URL}/upload/documents/delete/${id}`, {
			method: 'DELETE',
			headers: {
				'x-api-key': SERVER_API_KEY,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error(`Failed to delete Document ${id}:`, response.status, errorData);

			return NextResponse.json(
				{
					error: 'Failed to delete Document',
					details: response.statusText
				},
				{ status: response.status }
			);
		}

		// Parse response if it contains JSON data
		let responseData;
		try {
			const text = await response.text();
			responseData = text ? JSON.parse(text) : { message: 'Document deleted successfully' };
		} catch (parseError) {
			console.log(parseError)
			responseData = { message: 'Document deleted successfully' };
		}

		console.log(`Successfully deleted Document with ID: ${id}`);

		return NextResponse.json(responseData, { status: 200 });

	} catch (error) {
		console.error('Error in DELETE /api/faqs/[id]/delete:', error);

		return NextResponse.json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
}