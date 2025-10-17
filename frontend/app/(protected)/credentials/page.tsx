import {requireSuperAdmin} from "@/lib/auth/require-super-admin";
import CredentialsClient from "./CredentialsClient";

export default async function SettingsPage() {
	await requireSuperAdmin();
	return <CredentialsClient/>
}