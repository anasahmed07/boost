import {NextRequest, NextResponse} from 'next/server';


async function getAllCustomers(limit: string = "1000") {
	console.log(limit)
	try {
		const customersRes = await fetch(`${process.env.SERVER_BASE_URL || ""}/customers/?limit=${limit}`, {
			method: 'GET',
			headers: {
				'accept': 'application/json',
				'x-api-key': process.env.SERVER_API_KEY || "",
			},
			cache: 'no-store'
		});

		if (!customersRes.ok) {
			console.log(customersRes);
			throw new Error('Failed to fetch data');
		}

		return await customersRes.json();

	} catch (error) {
		console.error('Error processing customers:', error);
		throw error;
	}
}

export async function GET(request: NextRequest) {
	try {
		const limit = request.nextUrl.searchParams.get('limit') ?? "1000";
		console.log(limit)
		const result = await getAllCustomers(limit);
		console.log(result)
		return NextResponse.json(result);
	} catch (err) {
		console.error('Error fetching customers:', err);
		return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
	}
}