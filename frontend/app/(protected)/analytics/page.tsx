import AnalyticsClient from "./AnalyticsClient";
import {requireAuth} from "@/lib/auth/require-auth";

export default async function Analytics() {
	await requireAuth();

	return <AnalyticsClient />;
}