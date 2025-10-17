import SettingsClient from "./SettingsClient";
import {requireSuperAdmin} from "@/lib/auth/require-super-admin";

export default async function BulkMessagePageWrapper() {
	await requireSuperAdmin()

	return <SettingsClient />;
}