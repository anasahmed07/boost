import {NextRequest, NextResponse} from 'next/server';

async function getAllCustomersWithStatus(params: URLSearchParams) {
	try {
		// Build the query string with all parameters
		const queryParams = new URLSearchParams();

		// Pagination
		queryParams.set('limit', params.get('limit') || '10');
		queryParams.set('page', params.get('page') || '1');

		// Search
		if (params.get('search')) {
			queryParams.set('search', params.get('search')!);
		}

		// Tags filter
		if (params.get('tags')) {
			queryParams.set('tags', params.get('tags')!);
		}

		// Customer type filter (B2B/D2C)
		if (params.get('customer_type')) {
			queryParams.set('customer_type', params.get('customer_type')!);
		}

		// Escalation status filter
		if (params.get('escalation_status')) {
			queryParams.set('escalation_status', params.get('escalation_status')!);
		}

		// Active status filter
		if (params.get('is_active')) {
			queryParams.set('is_active', params.get('is_active')!);
		}

		// Spend filters
		if (params.get('min_spend')) {
			queryParams.set('min_spend', params.get('min_spend')!);
		}
		if (params.get('max_spend')) {
			queryParams.set('max_spend', params.get('max_spend')!);
		}

		// Sorting
		if (params.get('sort_by')) {
			queryParams.set('sort_by', params.get('sort_by')!);
		}
		if (params.get('sort_order')) {
			queryParams.set('sort_order', params.get('sort_order')!);
		}

		const url = `${process.env.SERVER_BASE_URL || ""}/chats/list-chats?${queryParams.toString()}`;

		console.log('Fetching chats with URL:', url);

		const chats = await fetch(url, {
			method: 'GET',
			headers: {
				'accept': 'application/json',
				'x-api-key': process.env.SERVER_API_KEY || "",
			},
			cache: 'no-store'
		});

		if (!chats.ok) {
			console.error('Failed to fetch chats:', chats.status, chats.statusText);
			throw new Error('Failed to fetch data');
		}

		return await chats.json();
	} catch (error) {
		console.error('Error processing customers:', error);
		throw error;
	}
}

export async function GET(request: NextRequest) {
	try {
		const result = await getAllCustomersWithStatus(request.nextUrl.searchParams);
		return NextResponse.json(result);
	} catch (err) {
		console.error('Error fetching customers:', err);
		return NextResponse.json({
			error: 'Failed to fetch customers',
			details: err instanceof Error ? err.message : 'Unknown error'
		}, { status: 500 });
	}
}