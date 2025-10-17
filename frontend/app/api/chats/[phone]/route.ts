import { NextRequest } from 'next/server';

export async function GET(
	req: NextRequest,
	context: { params: Promise<{ phone: string }> } // params is a Promise now
) {
	const { phone } = await context.params;


	const { searchParams } = new URL(req.url);
	const page = searchParams.get('page') ?? '1';
	const messagesCount = searchParams.get('messages_count') ?? '20';

	try {
		const res = await fetch(
			`${process.env.SERVER_BASE_URL}/chats/${phone}?page=${page}&messages_count=${messagesCount}`,
			{
				method: 'GET',
				headers: {
					accept: 'application/json',
					'x-api-key': process.env.API_KEY ?? 'abcd',
				},
				cache: 'no-store',
			}
		);

		console.table({fetch: true})
		if (!res.ok) {

			return Response.json({ error: `Upstream error: ${res.statusText}` }, { status: res.status });
		}

		const data = await res.json();
		data.page = 1;
		return Response.json(data);
	} catch (err) {
		console.error('Error fetching chat:', err);
		return Response.json({ error: 'Failed to fetch chat' }, { status: 500 });
	}
}
