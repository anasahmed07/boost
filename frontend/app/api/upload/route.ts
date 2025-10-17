import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		// Parse the incoming form data
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json(
				{ error: 'No file provided' },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: 'Invalid file type. Only .txt, .pdf, and .docx files are allowed.' },
				{ status: 400 }
			);
		}



		// Create form data for external API
		const externalFormData = new FormData();
		externalFormData.append('file', file);
		externalFormData.append('title', file.name.split('.')[0]); // Use filename without extension as title

		// Forward to external API
		const externalApiResponse = await fetch(`${process.env.SERVER_BASE_URL ?? ""}/upload`, {
			method: 'POST',
			body: externalFormData,
			headers: {
				'x-api-key': process.env.SERVER_API_KEY ?? "abcd", // if needed
			},
		});

		if (!externalApiResponse.ok) {
			const errorText = await externalApiResponse.text();
			console.error('External API error:', errorText);

			return NextResponse.json(
				{ error: 'Failed to upload file to external service' },
				{ status: externalApiResponse.status }
			);
		}

		const responseData = await externalApiResponse.json();

		return NextResponse.json({
			success: true,
			message: 'File uploaded successfully',
			data: responseData
		});

	} catch (error) {
		console.error('Upload error:', error);

		return NextResponse.json(
			{ error: 'Internal server error during file upload' },
			{ status: 500 }
		);
	}
}

// Handle unsupported methods
export async function GET() {
	return NextResponse.json(
		{ error: 'Method not allowed. Use POST to upload files.' },
		{ status: 405 }
	);
}

export async function PUT() {
	return NextResponse.json(
		{ error: 'Method not allowed. Use POST to upload files.' },
		{ status: 405 }
	);
}

export async function DELETE() {
	return NextResponse.json(
		{ error: 'Method not allowed. Use POST to upload files.' },
		{ status: 405 }
	);
}