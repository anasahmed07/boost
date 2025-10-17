import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;


export async function POST(request: NextRequest) {
	try {
		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: 'Server configuration missing' },
				{ status: 500 }
			);
		}

		const body = await request.json();
		const { secrets } = body;
		console.log(secrets);

		if (!secrets || !Array.isArray(secrets)) {
			return NextResponse.json(
				{ error: 'Secrets array is required' },
				{ status: 400 }
			);
		}

		if (secrets.length === 0) {
			return NextResponse.json(
				{ error: 'At least one secret is required' },
				{ status: 400 }
			);
		}

		for (const secret of secrets) {
			if (!secret.key || !secret.value) {
				return NextResponse.json(
					{ error: 'Each secret must have both key and value' },
					{ status: 400 }
				);
			}
		}

		const response = await fetch(`${SERVER_BASE_URL}/secrets/bulk`, {
			method: 'POST',
			headers: {
				'x-api-key': SERVER_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ secrets }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('External API Error:', errorText);
			throw new Error(`HTTP error. Status: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		console.log('Secrets updated successfully');

		return NextResponse.json(data);

	} catch (error) {
		console.log(error);

		return NextResponse.json(
			{
				error: 'Failed to update secrets',
			},
			{ status: 500 }
		);
	}
}