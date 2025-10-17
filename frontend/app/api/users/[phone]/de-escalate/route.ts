import { NextResponse } from "next/server";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ phone: string }> }
) {
	const { phone } = await params;

	try {
		const response = await fetch(`${process.env.SERVER_BASE_URL}/customers/${phone}/de-escalate`, {
			method: "POST",
			headers: {
				accept: "application/json",
				"x-api-key": process.env.SERVER_API_KEY || "abcd",
			},
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Upstream error: ${response.status}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return NextResponse.json(data);

	} catch (error) {
		console.error("API Error:", error);
		return NextResponse.json(
			{ error: (error instanceof Error) ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}