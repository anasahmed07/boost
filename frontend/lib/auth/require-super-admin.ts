import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export async function requireSuperAdmin() {
	const supabase = await createClient();

	const { data, error } = await supabase.auth.getClaims();
	if (error || !data?.claims) {
		redirect("/auth/login");
	}

	const { data: { user } } = await supabase.auth.getUser();

	const isSuperAdmin = user?.user_metadata?.role === 'super_admin' || user?.app_metadata?.is_super_admin === true;

	if (!isSuperAdmin) {
		redirect("/dashboard");
	}

	return user;
}