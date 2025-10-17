import { NextResponse } from "next/server";

export async function GET() {
	try {
		const response = await fetch(`${process.env.SERVER_BASE_URL}/analytics/customers/stats`, {
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
