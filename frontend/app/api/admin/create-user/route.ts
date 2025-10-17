// app/api/admin/create-user/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
// import {redirect} from "next/navigation";

// Create admin client using service role key
const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key, not anon key
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	}
);

export async function POST(request: NextRequest) {

	// Add this at the beginning of your POST function
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify the current user's session
	const token = authHeader.replace('Bearer ', '');
	const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

	const isAdmin = user?.user_metadata?.role === 'admin' ||
		user?.user_metadata?.role === 'super_admin' ||
		user?.app_metadata?.is_super_admin === true;


	if (error || !user) {
		return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
	}

	if (!isAdmin) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	// Optional: Check if user has permission to create users
	// You can check their role from your database here
	try {
		// Verify the requesting user is authenticated and has permission
		const { email, password, userData } = await request.json();

		// Optional: Add authentication check here to verify CLIU has permission
		// You can get the current user's token from the request headers

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'Email and password are required' },
				{ status: 400 }
			);
		}

		// Create user using admin client - this won't affect current session
		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true, // Auto-confirm email if you want
			user_metadata: userData || {} // Additional user data
		});

		if (authError) {
			return NextResponse.json(
				{ error: authError.message },
				{ status: 400 }
			);
		}

		// Optional: Add user to your custom tables if needed
		if (authData.user && userData) {
			const { error: profileError } = await supabaseAdmin
				.from('profiles') // or whatever your user profile table is called
				.insert({
					id: authData.user.id,
					email: authData.user.email,
					...userData
				});

			if (profileError) {
				console.error('Error creating user profile:', profileError);
			}
		}

		return NextResponse.json({
			success: true,
			user: {
				id: authData.user.id,
				email: authData.user.email,
				...userData
			}
		});

	} catch (error) {
		console.error('Error creating user:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}