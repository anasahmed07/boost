import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'https://valid-husky-willingly.ngrok-free.app';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}

		// Forward the file to your backend
		const backendFormData = new FormData();
		backendFormData.append('file', file);

		const response = await fetch(`${SERVER_BASE_URL}/upload/faq`, {
			method: 'POST',
			body: backendFormData,
			headers: {
				"x-api-key": process.env.BACKEND_API_KEY ?? "abcd"
			}
		});

		const result = await response.json();

		if (!response.ok) {
			return NextResponse.json({ error: 'Upload failed' }, { status: response.status });
		}

		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error('Upload error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}