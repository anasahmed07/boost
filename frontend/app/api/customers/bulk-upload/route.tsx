import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Use anon key

const supabase = createClient(supabaseUrl, supabaseKey);

// Define the customer data structure - matching your UserData type
export type UserData = {
	phone_number?: string;
	is_active?: boolean;
	escalation_status?: boolean;
	customer_type?: string;
	total_spend?: number;
	customer_name?: string;
	email?: string;
	address?: string;
	cart_id?: string;
	order_history?: string;
	socials?: string;
	customer_quickbook_id?: string;
	tags?: string[] | string;
	interest_groups?: string;
	company_name?: string;
}

interface CustomerData extends UserData {
	phone_number: string; // Required for database insert
	customer_type: 'B2B' | 'D2C'; // Required with specific values
	tags?: string[];
}

interface ImportRequest {
	customers: CustomerData[];
}

// Validate customer data
function validateCustomer(customer: CustomerData): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Required fields validation
	if (!customer.phone_number) {
		errors.push('Phone number is required');
	}

	if (!customer.customer_type) {
		errors.push('Customer type is required');
	} else if (!['B2B', 'D2C'].includes(customer.customer_type)) {
		errors.push('Customer type must be either B2B or D2C');
	}

	// Phone number format validation (basic)
	if (customer.phone_number && !/^\+?[\d\s\-\(\)]+$/.test(customer.phone_number)) {
		errors.push('Invalid phone number format');
	}

	// Email validation (if provided)
	if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
		errors.push('Invalid email format');
	}

	// Total spend validation
	if (customer.total_spend !== undefined && customer.total_spend !== null) {
		const spend = Number(customer.total_spend);
		if (isNaN(spend) || spend < 0) {
			errors.push('Total spend must be a non-negative number');
		}
	}

	// Tags validation
	if (customer.tags !== undefined && customer.tags !== null) {
		if (isString(customer.tags)) {
			const tagArray = customer.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
			if (tagArray.length === 0) errors.push('Tags cannot be empty if provided');
		} else if (isStringArray(customer.tags)) {
			if (customer.tags.length === 0 || customer.tags.some(tag => tag.trim().length === 0)) {
				errors.push('All tags must be non-empty strings');
			}
		} else {
			errors.push('Tags must be a string or string[]');
		}
	}


	return {
		isValid: errors.length === 0,
		errors
	};
}

// Clean and normalize customer data
function normalizeCustomer(customer: CustomerData): CustomerData {
	// Process tags - convert string to array or clean existing array
	let normalizedTags: string[] | undefined = undefined;

	if (customer.tags !== undefined && customer.tags !== null) {
		if (isString(customer.tags) && customer.tags.trim() !== '') {
			normalizedTags = customer.tags
				.split(',')
				.map(tag => tag.trim())
				.filter(tag => tag.length > 0);
		} else if (isStringArray(customer.tags)) {
			normalizedTags = customer.tags
				.map(tag => tag.trim())
				.filter(tag => tag.length > 0);
		}
	}


	return {
		phone_number: "92" + String(customer.phone_number || '').trim().replace(/\D/g, '').slice(-10),
		customer_name: customer.customer_name ? String(customer.customer_name).trim() : undefined,
		email: customer.email ? String(customer.email).trim().toLowerCase() : undefined,
		customer_type: customer.customer_type as 'B2B' | 'D2C',
		company_name: customer.company_name ? String(customer.company_name).trim() : undefined,
		address: customer.address ? String(customer.address).trim() : undefined,
		total_spend: customer.total_spend ? Number(customer.total_spend) || 0 : 0,
		is_active: customer.is_active !== undefined ? Boolean(customer.is_active) : true,
		escalation_status: customer.escalation_status !== undefined ? Boolean(customer.escalation_status) : false,
		cart_id: customer.cart_id ? String(customer.cart_id).trim() : undefined,
		order_history: customer.order_history ? String(customer.order_history).trim() : undefined,
		socials: customer.socials ? String(customer.socials).trim() : undefined,
		customer_quickbook_id: customer.customer_quickbook_id ? String(customer.customer_quickbook_id).trim() : undefined,
		tags: normalizedTags ?? [],
		interest_groups: customer.interest_groups ? String(customer.interest_groups).trim() : undefined,
	};
}

export async function POST(request: NextRequest) {
	try {
		// Parse request body
		const body: ImportRequest = await request.json();
		console.log(!body.customers);
		console.log(`[MDEBUG] <105> ${body}`);
		console.log(!Array.isArray(body.customers))
		if (!body.customers || !Array.isArray(body.customers)) {
			return NextResponse.json(
				{ error: 'Invalid request format. Expected customers array.' },
				{ status: 400 }
			);
		}
		console.log(body.customers)
		if (body.customers.length === 0) {
			return NextResponse.json(
				{ error: 'No customers provided for import.' },
				{ status: 400 }
			);
		}

		// Validate and normalize all customers
		const validationResults = body.customers.map((customer, index) => {
			const normalized = normalizeCustomer(customer);
			const validation = validateCustomer(normalized);
			return {
				index,
				customer: normalized,
				...validation
			};
		});
		console.log(validationResults)
		// Check for validation errors
		const invalidCustomers = validationResults.filter(result => !result.isValid);
		if (invalidCustomers.length > 0) {
			const errorDetails = invalidCustomers.map(({ index, errors }) => ({
				row: index + 1,
				errors
			}));

			return NextResponse.json(
				{
					error: 'Validation failed for some customers',
					details: errorDetails
				},
				{ status: 400 }
			);
		}
		// Extract valid customers
		const validCustomers = validationResults.map(result => result.customer);

		// Check for duplicate phone numbers in the batch
		const phoneNumbers = validCustomers.map(c => c.phone_number);
		const duplicatePhones = phoneNumbers.filter((phone, index) => phoneNumbers.indexOf(phone) !== index);
		if (duplicatePhones.length > 0) {
			return NextResponse.json(
				{
					error: 'Duplicate phone numbers found in import batch',
					duplicates: [...new Set(duplicatePhones)]
				},
				{ status: 400 }
			);
		}

		// Check for existing customers in database
		const { data: existingCustomers, error: checkError } = await supabase
			.from('customers')
			.select('phone_number')
			.in('phone_number', phoneNumbers);

		if (checkError) {
			console.error('Database check error:', checkError);
			return NextResponse.json(
				{ error: 'Failed to check for existing customers' },
				{ status: 500 }
			);
		}

		// Handle existing customers - you can choose to skip or update
		const existingPhones = existingCustomers?.map(c => c.phone_number) || [];
		const newCustomers = validCustomers.filter(c => !existingPhones.includes(c.phone_number));
		const existingCount = existingPhones.length;

		if (newCustomers.length === 0) {
			return NextResponse.json({
				message: 'All customers already exist in the database',
				summary: {
					total: validCustomers.length,
					new: 0,
					existing: existingCount,
					failed: 0
				}
			});
		}

		console.clear();
		console.log('New customers to insert:', newCustomers.map(c => ({
			phone_number: c.phone_number,
			tags: c.tags
		})));

		// Insert new customers
		const { data: insertedCustomers, error: insertError } = await supabase
			.from('customers')
			.insert(newCustomers)
			.select();

		if (insertError) {
			console.error('Database insert error:', insertError);
			return NextResponse.json(
				{
					error: 'Failed to insert customers',
					details: insertError.message
				},
				{ status: 500 }
			);
		}

		// Return success response
		return NextResponse.json({
			message: 'Customers imported successfully',
			summary: {
				total: validCustomers.length,
				new: newCustomers.length,
				existing: existingCount,
				failed: 0
			},
			imported: insertedCustomers?.length || 0
		});

	} catch (error) {
		console.error('Import error:', error);
		return NextResponse.json(
			{
				error: 'Internal server error',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// Optional: Handle GET requests to check API status
export async function GET() {
	return NextResponse.json({
		message: 'Customer Import API is running',
		endpoints: {
			POST: '/api/customers - Import customers from CSV data'
		}
	});
}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

// Type guard to check if a value is a string array
function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(v => typeof v === 'string');
}
