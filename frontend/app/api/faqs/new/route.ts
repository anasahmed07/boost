import { NextRequest, NextResponse } from 'next/server';
import {createClient} from "@/lib/supabase/server";

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

export async function POST(request: NextRequest) {
	try {

		const supabase = await createClient();
		const { data: userData, error } = await supabase.auth.getUser();
		if (error) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const email = userData.user.email!;

		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: 'Server configuration missing' },
				{ status: 500 }
			);
		}

		const body = await request.json();

		// Validate that body is an object with at least one question-answer pair
		if (!body || !body.question || !body.answer) {
			return NextResponse.json(
				{ error: 'Invalid FAQ data format.' },
				{ status: 400 }
			);
		}

		body.author = email;

		const response = await fetch(`${SERVER_BASE_URL}/upload/faq`, {
			method: 'POST',
			headers: {
				'x-api-key': SERVER_API_KEY,
				'Content-Type': "application/json",
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API error: ${response.status} - ${errorText}`);
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error creating FAQ:', error);
		return NextResponse.json(
			{ error: 'Failed to create FAQ' },
			{ status: 500 }
		);
	}
}