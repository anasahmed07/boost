import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export async function requireAuth() {
	const supabase = await createClient();

	const { data, error } = await supabase.auth.getClaims();
	if (error || !data?.claims) {
		redirect("/auth/login");
	}

	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	return user;
}