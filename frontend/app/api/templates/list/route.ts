import { NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

export async function GET() {
	try {
		const response = await fetch(`${SERVER_BASE_URL}/template`, {
			headers: {
				'x-api-key': `${SERVER_API_KEY}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error('Failed to fetch templates');
		}

		const templates = await response.json();
		return NextResponse.json(templates);
	} catch (error) {
		console.error('Error fetching templates:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch templates' },
			{ status: 500 }
		);
	}
}