import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	try {
		// Extract query parameters from the request URL
		const searchParams = request.nextUrl.searchParams;
		const startDate = searchParams.get('start_date');
		const endDate = searchParams.get('end_date');

		// Build query string if parameters exist
		const queryParams = new URLSearchParams();
		if (startDate) {
			queryParams.append('start_date', startDate);
		}
		if (endDate) {
			queryParams.append('end_date', endDate);
		}

		// Construct the URL with query parameters
		const url = `${process.env.SERVER_BASE_URL}/analytics/escalations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				accept: "application/json",
				"x-api-key": process.env.SERVER_API_KEY || "abcd",
			},
		});

		if (!response.ok) {
			return new NextResponse(
				JSON.stringify({ error: `Upstream error: ${response.status}` }),
				{ status: response.status, headers: { "Content-Type": "application/json" } }
			);
		}

		const data = await response.json();
		return new NextResponse(JSON.stringify(data), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new NextResponse(
			JSON.stringify({ error: (error instanceof Error) ? error.message : "Unknown error" }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}