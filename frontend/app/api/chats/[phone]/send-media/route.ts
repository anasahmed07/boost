import { NextRequest, NextResponse } from 'next/server';

// Define specific types for WhatsApp API responses
interface WhatsAppSuccessResponse {
	success: true;
	message?: string;
	messageId?: string;
	timestamp?: number;
	recipient?: string;
}

interface WhatsAppErrorResponse {
	success: false;
	error: string;
	code?: string;
	details?: string;
}

type WhatsAppApiResponse = WhatsAppSuccessResponse | WhatsAppErrorResponse;

// Define the response type for our API (matching what your component expects)
interface ApiSuccessResponse {
	success: true;
	message: string;
	data: WhatsAppApiResponse;
	messageType: 'image' | 'audio' | 'document';
	fileName: string;
	fileSize: number;
	fileType: string;
}

interface ApiErrorResponse {
	success?: false;
	error: string;
	details?: unknown;
	status?: number;
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// Define allowed file types
const ALLOWED_DOC_TYPES = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation'
] as const;

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ phone: string }> }
): Promise<NextResponse<ApiResponse>> {
	try {
		// Await the params object
		const { phone } = await params;
		const phone_number = phone;
		console.log('📞 Processing request for phone:', phone_number);

		// Parse the multipart form data
		console.log('📦 Parsing form data...');
		const formData = await request.formData();
		console.log('✅ Form data parsed successfully');

		// Extract fields
		const file = formData.get('file') as File | null;
		const caption = formData.get('caption') as string | null;
		const sender = formData.get('sender') as string | null;

		console.log('📄 Extracted fields:', {
			file: file ? `${file.name} (${file.type}, ${file.size} bytes)` : 'null',
			caption,
			sender
		});

		// Validate required fields
		if (!file) {
			console.log('❌ No file provided');
			return NextResponse.json(
				{ error: 'File is required' },
				{ status: 400 }
			);
		}

		// Determine file type and API endpoint based on file type
		const fileType = file.type;
		let endpoint = '';
		let messageType: 'image' | 'audio' | 'document';

		console.log('🔍 Determining file type for:', fileType);

		if (fileType.startsWith('image/')) {
			endpoint = 'send-image';
			messageType = 'image';
			console.log('🖼️ Detected as image');
		} else if (fileType.startsWith('audio/')) {
			endpoint = 'send-audio';
			messageType = 'audio';
			console.log('🎵 Detected as audio');
		} else {
			// For documents (PDF, DOC, DOCX, etc.)
			if (ALLOWED_DOC_TYPES.includes(fileType as typeof ALLOWED_DOC_TYPES[number])) {
				endpoint = 'send-document';
				messageType = 'document';
				console.log('📄 Detected as document');
			} else {
				console.log('❌ Unsupported file type:', fileType);
				return NextResponse.json(
					{ error: 'Unsupported file type. Supported types: images, audio, PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX' },
					{ status: 400 }
				);
			}
		}

		// Check file size (max 16MB for WhatsApp)
		const maxSize = 16 * 1024 * 1024; // 16MB
		if (file.size > maxSize) {
			console.log('❌ File too large:', file.size, 'bytes (max:', maxSize, ')');
			return NextResponse.json(
				{ error: 'File size must be less than 16MB' },
				{ status: 400 }
			);
		}

		console.log('✅ File size OK:', file.size, 'bytes');

		// Create form data for the WhatsApp API
		const whatsappFormData = new FormData();
		whatsappFormData.append('file', file);

		// Add caption if provided
		if (caption) {
			whatsappFormData.append('caption', caption);
		}

		// Add sender if provided
		if (sender) {
			whatsappFormData.append('sender', sender);
		}

		// Construct the API URL based on your server endpoint
		const baseUrl = process.env.SERVER_BASE_URL;
		const apiUrl = `${baseUrl}/chats/${phone_number}/${endpoint}`;

		console.log('🌐 Making request to:', apiUrl);
		console.log('📤 Request details:', {
			method: 'POST',
			hasFile: !!file,
			hasCaption: !!caption,
			hasSender: !!sender
		});

		// Make the request to WhatsApp API
		const response = await fetch(apiUrl, {
			method: 'POST',
			body: whatsappFormData,
			headers: {
				// Add any required headers for your WhatsApp API
				// Don't set Content-Type manually with FormData
				...(process.env.SERVER_API_KEY && {
					'Authorization': `Bearer ${process.env.SERVER_API_KEY}`,
				}),
				// Add ngrok bypass header if needed
				'ngrok-skip-browser-warning': 'true',
				'x-api-key': process.env.API_KEY ?? 'abcd',
			},
		});

		console.log("[MDEBUG] response: ", response);
		console.log('📡 Response status:', response.status);
		console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

		// Handle the response
		if (!response.ok) {
			let errorData: unknown;
			let errorText: string = '';
			try {
				errorText = await response.text();
				console.log('❌ Error response text:', errorText);
				errorData = JSON.parse(errorText);
			} catch {
				errorData = { message: `HTTP ${response.status}`, rawResponse: errorText };
			}

			console.log('❌ Error response:', errorData);

			return NextResponse.json(
				{
					error: 'Failed to send media',
					details: errorData,
					status: response.status
				},
				{ status: response.status }
			);
		}

		let successData: WhatsAppApiResponse;
		try {
			successData = await response.json() as WhatsAppApiResponse;
		} catch {
			successData = { success: true, message: 'Media sent successfully' };
		}

		console.log("[MDEBUG] successData: ", successData);
		return NextResponse.json({
			success: true,
			message: 'Media sent successfully',
			data: successData,
			messageType,
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type
		});

	} catch (error) {
		console.error('💥 Error in WhatsApp media proxy:', error);

		// Check if it's a FormData parsing error
		if (error instanceof Error && error.message.includes('FormData')) {
			console.error('📦 FormData parsing failed:', error.message);
			return NextResponse.json(
				{
					error: 'Failed to parse form data',
					details: error.message
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				error: 'Internal server error',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// Define GET response type
interface GetApiResponse {
	message: string;
	phone_number: string;
	usage: string;
	required_fields: string[];
	optional_fields: string[];
	supported_media_types: {
		images: string[];
		audio: string[];
		documents: string[];
	};
	max_file_size: string;
}

// Optional: Add GET method to return API information
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ phone: string }> }
): Promise<NextResponse<GetApiResponse>> {
	// Await the params object
	const { phone } = await params;

	return NextResponse.json({
		message: 'WhatsApp Media API Proxy',
		phone_number: phone,
		usage: 'Send POST request with multipart/form-data containing file',
		required_fields: ['file'],
		optional_fields: ['caption', 'sender'],
		supported_media_types: {
			images: ['JPEG', 'PNG', 'GIF', 'WEBP'],
			audio: ['MP3', 'WAV', 'OGG', 'M4A'],
			documents: ['PDF', 'DOC', 'DOCX', 'TXT', 'XLS', 'XLSX', 'PPT', 'PPTX']
		},
		max_file_size: '16MB'
	});
}