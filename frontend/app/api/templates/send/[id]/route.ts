import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;
interface TSCGFI {
	phone_number: string;
	customer_name: string;
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const {id} = await params;
		const body = await request.json();
		const { to, variables, } = body;
		const recipients = to.map((r: TSCGFI) => r.phone_number);
		
		const variablesParsed = Object.entries(variables).map(([key, value]) => ({
			name: key,
			value: value,
			type: "text",
		}));
		  
		// Log the submission for now since you don't have the server endpoint yet
		const payload = {
			// templateId: id,
			to: recipients,
			variables: variablesParsed,
			// campaign_id: campaignId,
			// timestamp: new Date().toISOString()
		}
		console.log(payload)
		// TODO: Replace this with actual API call when server endpoint is available
		const response = await fetch(`${SERVER_BASE_URL}/template/${id}/send_bulk`, {
		  method: 'POST',
		  headers: {
		    'x-api-key': `${SERVER_API_KEY}`,
		    'Content-Type': 'application/json',
		  },
		  body: JSON.stringify(payload)
		});

		if (!response.ok) {
			console.log(response)
		  throw new Error('Failed to send template message');
		}

		const result = await response.json();
		console.log(result)
		return NextResponse.json(result);

		// For now, return a mock success response
		// return NextResponse.json({
		// 	success: true,
		// 	message: 'Template message queued for sending',
		// 	sentTo: to.length
		// });

	} catch (error) {
		console.error('Error sending template message:', error);
		return NextResponse.json(
			{ error: 'Failed to send template message' },
			{ status: 500 }
		);
	}
}