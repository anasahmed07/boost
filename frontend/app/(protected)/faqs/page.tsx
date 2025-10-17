import FaqsClient from "./FaqsClient";
import {requireAuth} from "@/lib/auth/require-auth";

export default async function SettingsPage() {
	await requireAuth();
	return <FaqsClient/>
}