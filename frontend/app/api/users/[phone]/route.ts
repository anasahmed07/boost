import { NextResponse } from "next/server";

const SERVER_BASE_URL = process.env.SERVER_BASE_URL!;
const SERVER_API_KEY = process.env.SERVER_API_KEY!;

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ phone: string }> }
) {


	const { phone } = await params;

	// return Response.json({"i hate": "black people"});
	try {

		if (!SERVER_BASE_URL || !SERVER_API_KEY) {
			return NextResponse.json(
				{ error: `Missing Credentials` },
				{ status: 500 }
			);
		}

		const response = await fetch(`${SERVER_BASE_URL}/customers/${phone}`, {
			method: "GET",
			headers: {
				accept: "application/json",
				"x-api-key": SERVER_API_KEY || "abcd",
			},
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Upstream error: ${response.status}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		console.log("Backend user data:", data);

		return NextResponse.json(data);

	} catch (error) {
		console.error("API Error:", error);
		return NextResponse.json(
			{ error: (error instanceof Error) ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}

interface EditData {
	customer_name: string;
	email: string;
	address: string;
	company_name: string;
	tags: string[];
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ phone: string }> }
) {

	const { phone } = await params;

	try {
		const editData: EditData = await request.json();

		// Validate required fields if needed
		if (!phone) {
			return NextResponse.json(
				{ error: 'Phone parameter is required' },
				{ status: 400 }
			);
		}

		const response = await fetch(`${SERVER_BASE_URL}/customers/${phone}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': SERVER_API_KEY
			},
			body: JSON.stringify(editData),
		});

		if (!response.ok) {
			throw new Error(`Server responded with status: ${response.status}`);
		}

		const data = await response.json();

		return NextResponse.json(data, { status: 200 });

	} catch (error) {
		console.error('Error updating customer:', error);
		return NextResponse.json(
			{ error: 'Failed to update customer' },
			{ status: 500 }
		);
	}

}