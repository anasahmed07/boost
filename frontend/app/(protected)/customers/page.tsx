import UsersClient from "@/app/(protected)/customers/CustomersClient";
import {requireAdmin} from "@/lib/auth/require-admin";


export default async function Home() {
	await requireAdmin();
	return <UsersClient/>
}