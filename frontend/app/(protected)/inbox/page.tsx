import InboxClient from "@/app/(protected)/inbox/InboxClient";
import {requireAuth} from "@/lib/auth/require-auth";


export default async function Home() {

	await requireAuth();

	return <InboxClient/>


}


