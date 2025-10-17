import { LoginForm } from "@/components/supabase/login-form";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export default async function Page() {
	const supabase = await createClient();

	const { data, error } = await supabase.auth.getClaims();

	if (!error && data?.claims) {
		// Already logged in → send to dashboard
		redirect("/dashboard?already-logged-in=true");
	}
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
		</div>
	);
}
