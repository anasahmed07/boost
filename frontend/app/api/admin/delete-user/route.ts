import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
	try {
		const { userId } = await req.json()

		if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 })

		const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

		if (error) return NextResponse.json({ error: error.message }, { status: 400 })

		return NextResponse.json({ success: true })
	} catch (error) {
		console.log(error)
		return Response.json({ error: 'Failed to update user' }, { status: 500 });
	}
}
