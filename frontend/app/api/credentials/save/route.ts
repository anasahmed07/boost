import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:', {
	hasUrl: !!supabaseUrl,
	hasServiceKey: !!supabaseServiceKey,
	urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
});

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface ApiConfig {
	// WhatsApp API
	WHATSAPP_ACCESS_TOKEN: string;
	WHATSAPP_VERIFY_TOKEN: string;
	WHATSAPP_PHONE_NUMBER_ID: string;

	// OpenAI
	OPENAI_API_KEY: string;

	// Supabase
	SUPABASE_API_KEY: string;
	SUPABASE_URL: string;

	// QuickBooks
	QB_ACCESS_TOKEN: string;
	QB_CLIENT_ID: string;
	QB_CLIENT_SECRET: string;
	QB_ENVIRONMENT: string;
	QB_REDIRECT_URI: string;
	QB_REFRESH_TOKEN: string;
	QB_REALM_ID: string;
	QB_ACCESS_TOKEN_CREATED_AT: string;
	QB_AUTH_CODE: string;

	// Frontend
	FRONTEND_API_KEY: string;

	// Shopify
	SHOPIFY_ACCESS_TOKEN: string;
	SHOPIFY_STORE_URL: string;

	// Shipping APIs
	POSTEX_API_TOKEN: string;
	LEOPARDS_API_KEY: string;
	LEOPARDS_API_PASSWORD: string;
}

interface SaveRequest {
	section: string;
	credentials: Partial<ApiConfig>;
}

interface SaveResponse {
	success: boolean;
	message: string;
	errors?: Record<string, string>;
}

// Secret names mapping (keeping the same structure for consistency)
const secretNames: Record<keyof ApiConfig, string> = {
	'WHATSAPP_ACCESS_TOKEN': 'whatsapp_access_token',
	'WHATSAPP_VERIFY_TOKEN': 'whatsapp_verify_token',
	'WHATSAPP_PHONE_NUMBER_ID': 'whatsapp_phone_number_id',
	'OPENAI_API_KEY': 'openai_api_key',
	'SUPABASE_API_KEY': 'supabase_api_key',
	'SUPABASE_URL': 'supabase_url',
	'QB_ACCESS_TOKEN': 'qb_access_token',
	'QB_CLIENT_ID': 'qb_client_id',
	'QB_CLIENT_SECRET': 'qb_client_secret',
	'QB_ENVIRONMENT': 'qb_environment',
	'QB_REDIRECT_URI': 'qb_redirect_uri',
	'QB_REFRESH_TOKEN': 'qb_refresh_token',
	'QB_REALM_ID': 'qb_realm_id',
	'QB_ACCESS_TOKEN_CREATED_AT': 'qb_access_token_created_at',
	'QB_AUTH_CODE': 'qb_auth_code',
	'FRONTEND_API_KEY': 'frontend_api_key',
	'SHOPIFY_ACCESS_TOKEN': 'shopify_access_token',
	'SHOPIFY_STORE_URL': 'shopify_store_url',
	'POSTEX_API_TOKEN': 'postex_api_token',
	'LEOPARDS_API_KEY': 'leopards_api_key',
	'LEOPARDS_API_PASSWORD': 'leopards_api_password'
};

// Test database connection
async function testConnection(): Promise<{ success: boolean; error?: string }> {
	try {
		console.log('Testing database connection...');

		// Test basic table access
		const { error } = await supabase
			.from('secure_api_credentials')
			.select('name')
			.limit(1);

		if (error) {
			console.error('Database connection test failed:', error);
			return { success: false, error: `Database access error: ${error.message}` };
		}

		console.log('Database connection test successful');
		return { success: true };
	} catch (error) {
		console.error('Database connection exception:', error);
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Helper function to store secret using the new system
async function storeSecret(name: string, secret: string): Promise<{ success: boolean; error?: string }> {
	try {
		console.log(`Storing credential: ${name}`);

		const { error } = await supabase.rpc('store_credential', {
			secret_name: name,
			secret_value: secret
		});

		if (error) {
			console.error(`Failed to store ${name}:`, error);
			return { success: false, error: error.message };
		}

		console.log(`Successfully stored: ${name}`);
		return { success: true };
	} catch (error) {
		console.error(`Exception storing ${name}:`, error);
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Helper function to retrieve secret using the new system
async function getSecret(name: string): Promise<{ success: boolean; secret?: string; error?: string }> {
	try {
		console.log(`Retrieving credential: ${name}`);

		const { data, error } = await supabase.rpc('get_credential', {
			secret_name: name
		});

		if (error) {
			console.error(`Failed to retrieve ${name}:`, error);
			return { success: false, error: error.message };
		}

		console.log(`Successfully retrieved: ${name}`);
		return { success: true, secret: data || '' };
	} catch (error) {
		console.error(`Exception retrieving ${name}:`, error);
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Helper function to store metadata in regular table
async function storeMetadata(section: string, secretNames: string[]): Promise<{ success: boolean; error?: string }> {
	try {
		console.log('Storing metadata:', { section, secretCount: secretNames.length });

		const credentialsId = 1;
		const { error } = await supabase
			.from('api_credentials_metadata')
			.upsert({
				id: credentialsId,
				section: section,
				secret_names: secretNames,
				updated_at: new Date().toISOString()
			})
			.select();

		if (error) {
			console.error('Error storing metadata:', error);
			return { success: false, error: error.message };
		}

		console.log('Successfully stored metadata');
		return { success: true };
	} catch (error) {
		console.error('Exception storing metadata:', error);
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

export async function POST(request: NextRequest): Promise<NextResponse<SaveResponse>> {
	try {
		console.log('POST request started');

		// Check environment variables first
		if (!supabaseUrl || !supabaseServiceKey) {
			console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
			return NextResponse.json({
				success: false,
				message: 'Server configuration error: Missing Supabase credentials'
			}, { status: 500 });
		}

		// Test connection first
		const connectionTest = await testConnection();
		if (!connectionTest.success) {
			return NextResponse.json({
				success: false,
				message: `Database connection failed: ${connectionTest.error}`
			}, { status: 500 });
		}

		const body: SaveRequest = await request.json();
		console.log('Request body:', { section: body.section, credentialKeys: Object.keys(body.credentials || {}) });

		const { section, credentials } = body;

		// Validate required fields
		if (!section || !credentials) {
			return NextResponse.json({
				success: false,
				message: 'Missing required fields: section and credentials'
			}, { status: 400 });
		}

		const validCredentials = Object.entries(credentials).filter(([, value]) =>
			value && typeof value === 'string' && value.trim() !== ''
		);

		console.log('Valid credentials to store:', validCredentials.length);

		// If no valid credentials to save
		if (validCredentials.length === 0) {
			return NextResponse.json({
				success: false,
				message: 'No valid credentials provided'
			}, { status: 400 });
		}

		// Store each credential
		const storedSecrets: string[] = [];
		const errors: Record<string, string> = {};

		for (const [key, value] of validCredentials) {
			const secretName = secretNames[key as keyof ApiConfig];
			if (secretName) {
				console.log(`Processing credential: ${key} -> ${secretName}`);
				const result = await storeSecret(secretName, value as string);
				if (result.success) {
					storedSecrets.push(secretName);
					console.log(`✅ Stored: ${secretName}`);
				} else {
					errors[key] = result.error || 'Failed to store credential';
					console.error(`❌ Failed to store ${key}:`, result.error);
				}
			} else {
				console.warn(`No secret mapping found for: ${key}`);
			}
		}

		console.log('Storage results:', { stored: storedSecrets.length, errors: Object.keys(errors).length });

		// If there were errors storing secrets
		if (Object.keys(errors).length > 0) {
			return NextResponse.json({
				success: false,
				message: 'Some credentials failed to save',
				errors
			}, { status: 400 });
		}

		// Store metadata about which secrets we have
		const metadataResult = await storeMetadata(section, storedSecrets);
		if (!metadataResult.success) {
			console.error('Failed to store metadata:', metadataResult.error);
			// Continue anyway as the secrets were stored successfully
		}

		console.log(`✅ Successfully saved ${storedSecrets.length} credentials`);
		return NextResponse.json({
			success: true,
			message: `${section === 'all' ? 'All credentials' : 'Section credentials'} saved successfully`
		});

	} catch (error) {
		console.error('❌ Error in API route:', error);
		return NextResponse.json({
			success: false,
			message: error instanceof Error ? error.message : 'Internal server error'
		}, { status: 500 });
	}
}

// GET method to retrieve credentials
export async function GET(): Promise<NextResponse<ApiConfig | { error: string }>> {
	try {
		console.log('GET request started');

		// Test connection first
		const connectionTest = await testConnection();
		if (!connectionTest.success) {
			return NextResponse.json({
				error: `Database connection failed: ${connectionTest.error}`
			}, { status: 500 });
		}

		// Initialize empty config
		const config: ApiConfig = {
			WHATSAPP_ACCESS_TOKEN: '',
			WHATSAPP_VERIFY_TOKEN: '',
			WHATSAPP_PHONE_NUMBER_ID: '',
			OPENAI_API_KEY: '',
			SUPABASE_API_KEY: '',
			SUPABASE_URL: '',
			QB_ACCESS_TOKEN: '',
			QB_CLIENT_ID: '',
			QB_CLIENT_SECRET: '',
			QB_ENVIRONMENT: '',
			QB_REDIRECT_URI: '',
			QB_REFRESH_TOKEN: '',
			QB_REALM_ID: '',
			QB_ACCESS_TOKEN_CREATED_AT: '',
			QB_AUTH_CODE: '',
			FRONTEND_API_KEY: '',
			SHOPIFY_ACCESS_TOKEN: '',
			SHOPIFY_STORE_URL: '',
			POSTEX_API_TOKEN: '',
			LEOPARDS_API_KEY: '',
			LEOPARDS_API_PASSWORD: ''
		};

		// Get all secrets
		const retrievalPromises = Object.entries(secretNames).map(async ([frontendKey, secretName]) => {
			const result = await getSecret(secretName);
			return {
				frontendKey: frontendKey as keyof ApiConfig,
				success: result.success,
				secret: result.secret || '',
				error: result.error
			};
		});

		const results = await Promise.all(retrievalPromises);

		// Process results
		const errors: string[] = [];
		let retrievedCount = 0;

		results.forEach(result => {
			if (result.success) {
				config[result.frontendKey] = result.secret;
				if (result.secret.trim() !== '') {
					retrievedCount++;
				}
			} else {
				errors.push(`Failed to retrieve ${result.frontendKey}: ${result.error}`);
			}
		});

		if (errors.length > 0) {
			console.error('Some credentials failed to load:', errors);
			// Return partial config anyway
		}

		console.log(`✅ Retrieved ${retrievedCount} credentials`);
		return NextResponse.json(config);

	} catch (error) {
		console.error('❌ Error retrieving credentials:', error);
		return NextResponse.json({
			error: 'Failed to retrieve credentials'
		}, { status: 500 });
	}
}