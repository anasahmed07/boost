import { NextResponse } from "next/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ phone: string }> }
) {
	const { searchParams } = new URL(req.url);
	const { phone } = await params;
	const page = searchParams.get("page") || "1";
	const messagesCount = searchParams.get("messagesCount") || "20";

	try {
		const res = await fetch(
			`http://localhost:8000/chats/${phone}?page=${page}&messagesCount=${messagesCount}`,
			{
				headers: {
					accept: 'application/json',
					'x-api-key': process.env.SERVER_API_KEY || "", // better to store in env variable
				},
				cache: "no-store", // avoid caching chats
			}
		);

		if (!res.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch chats" },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{ error: "Server error", details: (error as Error).message },
			{ status: 500 }
		);
	}
}
