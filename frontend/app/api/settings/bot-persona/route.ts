import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { persona } = body;

		// Validate the persona data
		if (!persona || typeof persona !== 'string' || persona.trim().length === 0) {
			return NextResponse.json(
				{ error: 'Persona is required and must be a non-empty string' },
				{ status: 400 }
			);
		}



		/*
		// Submit to external API - COMMENTED OUT FOR NOW
		const externalApiResponse = await fetch('https://your-external-api.com/bot/persona', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${process.env.EXTERNAL_API_TOKEN}`,
				'X-API-Key': process.env.EXTERNAL_API_KEY,
			},
			body: JSON.stringify({
				persona: persona.trim(),
				timestamp: new Date().toISOString(),
				updatedBy: user?.id || 'system'
			})
		});

		if (!externalApiResponse.ok) {
			const errorData = await externalApiResponse.json();
			console.error('External API error:', errorData);
			return NextResponse.json(
				{ error: 'Failed to update bot persona on external service' },
				{ status: 500 }
			);
		}

		const externalResult = await externalApiResponse.json();
		console.log('Bot persona updated successfully:', externalResult);
		*/

		// For now, just log the persona and return success
		console.log('Bot persona received:', {
			persona: persona.trim(),
			length: persona.trim().length,
			timestamp: new Date().toISOString()
		});

		// Simulate processing time
		await new Promise(resolve => setTimeout(resolve, 500));

		return NextResponse.json({
			success: true,
			message: 'Bot persona updated successfully',
			data: {
				persona: persona.trim(),
				updatedAt: new Date().toISOString()
			}
		});

	} catch (error) {
		console.error('Error updating bot persona:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}