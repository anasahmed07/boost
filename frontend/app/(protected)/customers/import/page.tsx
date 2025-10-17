import AddCustomersClient from "./ImportCustomersClient";
import {requireAdmin} from "@/lib/auth/require-admin";

export default async function Home() {
	await requireAdmin();
	return <AddCustomersClient/>
}