import { requireAdmin } from "@/lib/auth/require-admin";
import BroadcastClient from "./BroadcastClient";

export default async function BulkMessagePageWrapper() {
	await requireAdmin()

	return <BroadcastClient />;
}