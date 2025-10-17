import React from "react";
import ChatClient from "./ChatClient";
import {requireAuth} from "@/lib/auth/require-auth";


export default async function ChatPage({ params }: { params: Promise<{ phone: string }>  }) {

	const { phone } = await params;
	await requireAuth();
	return <ChatClient phone={phone}/>

}