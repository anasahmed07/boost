import ExportChatsClient from "./ExportChatsClient";
import {requireSuperAdmin} from "@/lib/auth/require-super-admin";


export default async function Home() {

    await requireSuperAdmin();

    return <ExportChatsClient/>


}


