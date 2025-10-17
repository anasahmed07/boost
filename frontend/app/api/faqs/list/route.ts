import {NextResponse} from "next/server";

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

export async function GET() {
	try {
		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: 'Server configuration missing' },
				{ status: 500 }
			);
		}

		const response = await fetch(`${SERVER_BASE_URL}/upload/faqs/list`, {
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
		data.faqs = data.faqs.reverse();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching secrets:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch secrets' },
			{ status: 500 }
		);
	}
}