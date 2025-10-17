import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export default async function Home() {

    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        return redirect("/auth/login");
    }

    return redirect("/dashboard")
}
