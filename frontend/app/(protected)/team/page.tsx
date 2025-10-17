import UsersClient from "./TeamClient";
import {requireAdmin} from "@/lib/auth/require-admin";

export default async function Page() {
	await requireAdmin()

	return <UsersClient/>
}