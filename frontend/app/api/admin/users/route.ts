// app/api/admin/users/route.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
	try {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers();

		if (error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		return Response.json({ users: data.users });
	} catch (error) {
		console.log(error)
		return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
	}
}