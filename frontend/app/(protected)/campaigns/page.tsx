import CampaignsClient from "./CampaignsClient"
import { createClient } from '@/lib/supabase/server'
import {requireAdmin} from "@/lib/auth/require-admin";

export default async function CampaignsPageWrapper() {
	await requireAdmin()

	const supabase = await createClient() // Add await here
	const { data: { user } } = await supabase.auth.getUser()

	return <CampaignsClient user={user} />
}