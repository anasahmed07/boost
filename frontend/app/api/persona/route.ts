import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:8000';

export async function GET() {
	try {
		const response = await fetch(`${SERVER_BASE_URL}/persona/get_all`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': process.env.API_KEY ?? 'abcd',
			},
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Failed to fetch personas' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching personas:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();
		const { agent_name, new_persona } = body;

		if (!agent_name || !new_persona) {
			return NextResponse.json(
				{ error: 'Missing required fields: agent_name and new_persona' },
				{ status: 400 }
			);
		}

		const response = await fetch(`${SERVER_BASE_URL}/persona`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': process.env.API_KEY ?? 'abcd',
			},
			body: JSON.stringify({
				agent_name,
				new_persona,
			}),
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Failed to update persona' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error updating persona:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}