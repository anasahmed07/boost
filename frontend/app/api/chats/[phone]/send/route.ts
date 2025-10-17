import { NextRequest } from 'next/server';

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ phone: string }> } // params is now a Promise
) {
	try {
		const { phone } = await context.params; // ✅ await it here
		// Destructure directly from the frontend request body
		const { content, sender } = await req.json();

		if (!content || !sender) {
			return Response.json(
				{ error: 'Missing required fields: content, sender' },
				{ status: 400 }
			);
		}

		const res = await fetch(
			`${process.env.SERVER_BASE_URL}/chats/${phone}/send`,
			{
				method: 'POST',
				headers: {
					accept: 'application/json',
					'x-api-key': process.env.API_KEY ?? 'abcd',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content, sender }),
			}
		);

		if (!res.ok) {
			return Response.json(
				{ error: `Upstream error: ${res.statusText}` },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return Response.json(data);
	} catch (err) {
		console.error('Error sending chat message:', err);
		return Response.json({ error: 'Failed to send chat message' }, { status: 500 });
	}
}
