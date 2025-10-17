// app/api/secrets/bulk/route.ts

import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

interface SecretItem {
	key: string;
	value: string;
}

interface BulkSecretsRequest {
	secrets: SecretItem[];
}

export async function POST(request: NextRequest) {
	try {
		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: 'Server configuration missing' },
				{ status: 500 }
			);
		}

		const body: BulkSecretsRequest = await request.json();
		const { secrets } = body;

		// Validate the request
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

		// Validate each secret
		for (const secret of secrets) {
			if (!secret.key || !secret.value) {
				return NextResponse.json(
					{ error: 'Each secret must have both key and value' },
					{ status: 400 }
				);
			}
		}

		console.log('🔐 Updating secrets in bulk:', secrets.map(s => s.key));

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
			console.error('❌ External API Error:', errorText);
			throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		console.log('✅ Secrets updated successfully');

		return NextResponse.json(data);
	} catch (error) {
		console.error('❌ Error updating secrets in bulk:', error);
		return NextResponse.json(
			{
				error: 'Failed to update secrets',
				details: process.env.NODE_ENV === 'development' ? error : undefined
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
	try {
		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: 'Server configuration missing' },
				{ status: 500 }
			);
		}

		const response = await fetch(`${SERVER_BASE_URL}/secrets`, {
			method: 'GET',
			headers: {
				'x-api-key': SERVER_API_KEY,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching secrets:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch secrets' },
			{ status: 500 }
		);
	}
}