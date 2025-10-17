// import { SignUpForm } from "@/components/supabase/sign-up-form";
import {requireAdmin} from "@/lib/auth/require-admin";
import AddUserClient from "./AddTeamClient"
export default async function Page() {
    await requireAdmin()

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-lg">
                <AddUserClient />
            </div>
        </div>
    );
}
