// app/api/admin/users/update-role/route.js
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
	try {
		const { userId, role }: { userId: string; role: 'admin' | 'representative' } = await request.json();

		const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
			user_metadata: { role }
		});

		if (error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		return Response.json({ success: true, user: data.user });
	} catch (error) {
		console.log(error)
		return Response.json({ error: 'Failed to update user' }, { status: 500 });
	}
}