import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

interface Cust {
	phone_number: string;
	customer_name: string;
}

export async function POST(request: NextRequest) {

	console.log("FUCK")
	try {
		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: 'Server configuration missing' },
				{ status: 500 }
			);
		}

		const body = await request.json();
		console.log(body)
		// Validate that body is an object with at least one question-answer pair
		if (!body || !body.campaign_id || !body.customers) {
			return NextResponse.json(
				{ error: 'Invalid data format.' },
				{ status: 400 }
			);
		}

		body.customers = body.customers.map((customer: Cust) => customer.customer_name ? {customer_name: customer.customer_name, phone_number: customer.phone_number} : {customer_name: "valued customer", phone_number: customer.phone_number})
		console.log('', body)
		const response = await fetch(`${SERVER_BASE_URL}/broadcasts`, {
			method: 'POST',
			headers: {
				'x-api-key': SERVER_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API error: ${response.status} - ${errorText}`);
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error sending broadcast', error);
		return NextResponse.json(
			{ error: 'Failed to send broadcast' },
			{ status: 500 }
		);
	}
}