import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ phone: string }> }
) {
	try {
		const { phone } = await params;

		if (!phone) {
			return NextResponse.json(
				{ error: 'Phone number is required' },
				{ status: 400 }
			);
		}

		const serverBaseUrl = process.env.SERVER_BASE_URL;

		if (!serverBaseUrl) {
			console.error('SERVER_BASE_URL environment variable is not set');
			return NextResponse.json(
				{ error: 'Server configuration error' },
				{ status: 500 }
			);
		}

		// Call the backend API to delete customer data and chat history
		const response = await fetch(`${serverBaseUrl}/customers/${phone}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				// Add any authentication headers if needed
				'x-api-key': `${process.env.SERVER_API_KEY}`,
			},
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error(`Failed to delete customer ${phone}:`, response.status, errorData);

			return NextResponse.json(
				{
					error: 'Failed to delete customer data',
					details: response.statusText
				},
				{ status: response.status }
			);
		}

		// Parse response if it contains JSON data
		let responseData;
		try {
			const text = await response.text();
			responseData = text ? JSON.parse(text) : { message: 'Customer data deleted successfully' };
		} catch (parseError) {
			console.log(parseError)
			responseData = { message: 'Customer data deleted successfully' };
		}

		console.log(`Successfully deleted customer data for phone: ${phone}`);

		return NextResponse.json(responseData, { status: 200 });

	} catch (error) {
		console.error('Error in DELETE /api/customers/[phone]/delete:', error);

		return NextResponse.json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
}