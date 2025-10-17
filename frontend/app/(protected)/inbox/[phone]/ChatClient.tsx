"use client";

import React, {useEffect, useState } from "react";

import ChatList from "@/app/(protected)/inbox/[phone]/ChatList";
import BackButton from "@/components/ui/BackButton";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import PageLoader from "@/components/ui/PageLoader";
import Spinner from "@/components/ui/Spinner";
import Toast from "@/components/ui/Toast";

import {ChatApiResponse} from "@/types/responses";
import {ChatMessage} from "@/types/chat";
import {UserData} from "@/types/user";

import { createClient } from "@/lib/supabase/client";
import {formatPakPhone} from "@/utils/formats";
import PropertiesPanel from "@/app/(protected)/inbox/[phone]/PropertiesPanel";


export default function ChatClient({ phone }: { phone: string }) {
	// Ignore these comments, the dev has dementia
	const supabase = createClient();

	// The phone string will contain the phone number
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null); // Changed to string to store error message
	const [chatData, setChatData] = useState<ChatApiResponse>({
		phone_number: phone,
		page: 1,
		messages: [],
	});
	const [escalationLoading, setEscalationLoading] = useState(false);
	const [isEscalated, setIsEscalated] = useState<boolean | null>(null);
	const [customerName, setCustomerName] = useState("Unknown");
	const [repName, setRepName] = useState("Support Representative");
	const [showToast, setShowToast] = useState(false);

	// Function to show error toast
	const showError = (message: string) => {
		setError(message);
		setShowToast(true);
		// In your showError function:

		console.log("Setting error:", message); // Debug log
		setError(message);
		setShowToast(true);
		console.log("Error state should be:", message, "Show toast:", true); // Debug log

	};

	// Fetch current user's name from Supabase
	useEffect(() => {
		async function fetchRepName() {
			try {
				const { data: { user }, error } = await supabase.auth.getUser();
				if (error) {
					console.error('Error fetching user:', error);
				} else if (user?.user_metadata?.name) {
					setRepName(user.user_metadata.name);
				}
			} catch (error) {
				console.error('Error:', error);
			}
		}

		void fetchRepName();
	}, [supabase]);

	useEffect(() => {
		async function fetchChat() {
			try {
				const res = await fetch(`/api/chats/${phone}?page=1&messages_count=20`, {
					method: 'GET',
					headers: { Accept: 'application/json' },
				});

				if (!res.ok) {
					const errorMessage = `Failed to load chat (${res.status}): ${res.statusText}`;
					console.error(errorMessage);
					showError(errorMessage);
					return;
				}

				const data: ChatApiResponse = await res.json();
				setChatData(data);
			} catch (err) {
				console.error('Chat fetch error:', err);
				showError("Failed to load chat data. Please check your connection and try again.");
			} finally {
				setLoading(false);
			}
		}

		void fetchChat();
	}, [phone]);

	const getEscalationPermission = (messages: ChatMessage[]) => {
		if (!messages[0]) return false;
		for (let i = 0; i < messages.length; i++) {

			if (messages[i].sender !== "customer") continue;
			console.log(messages[i].content)
			const ts = new Date(messages[i].time_stamp).getTime();
			const now = Date.now();
			const tfh = 23 * 60 * 60 * 1000;

			if ((now - ts) > tfh) {
				return false;
			}
			return true;
		}
	}

	useEffect(() => {
		async function fetchEscalationStatus() {
			try {
				const res = await fetch(`/api/users/${phone}`, {
					method: 'GET',
					headers: { Accept: 'application/json' },
				});

				if (!res.ok) {
					const errorMessage = `Failed to load user data (${res.status}): ${res.statusText}`;
					console.error(errorMessage);
					showError(errorMessage);
					return;
				}

				const data: UserData = await res.json();
				setIsEscalated(data.escalation_status === true);
				setCustomerName(data?.customer_name ?? "Unknown");

			} catch (err) {
				console.error('Escalation status fetch error:', err);
				showError("Failed to load escalation status. Please try again.");
			}
		}

		fetchEscalationStatus();
	}, [phone]);

	const handleToggle = async () => {
		const newState = !isEscalated;
		setEscalationLoading(true);

		try {
			if (newState) {

				const messages = chatData.messages;
				const permission = getEscalationPermission(messages);
				if (!permission) {
					showError("Can not escalate chat due to last customer message being more than 23 hours ago. If you think this is an error, please refresh the page & try again.")
					return setIsEscalated(false);
				}

				// Escalating
				const res = await fetch(`/api/users/${phone}/escalate`, {
					method: "POST",
					headers: { Accept: 'application/json' }
				});

				if (!res.ok) {
					const errorMessage = `Failed to escalate chat (${res.status}): ${res.statusText}`;
					showError(errorMessage);
					return;
				}

				setIsEscalated(true);
			} else {
				// De-escalating
				const res = await fetch(`/api/users/${phone}/de-escalate`, {
					method: "POST",
					headers: { Accept: 'application/json' }
				});

				if (!res.ok) {
					const errorMessage = `Failed to de-escalate chat (${res.status}): ${res.statusText}`;
					showError(errorMessage);
					return;
				}

				setIsEscalated(false);

				// send bye-bye message
				// const inputValue = `Thank you for chatting with ${repName} from Boost Buddy help desk.`
				// const toAppend: ChatMessage = {
				// 	content: inputValue,
				// 	message_type: "text",
				// 	sender: "representative",
				// 	time_stamp: new Date().toISOString(),
				// };
				//
				// const byeBye = await fetch(`/api/chats/${phone}/send`, {
				// 	method: "POST",
				// 	headers: {
				// 		'Accept': 'application/json',
				// 		'Content-Type': 'application/json'
				// 	},
				// 	body: JSON.stringify({
				// 		content: inputValue,
				// 		sender: "representative",
				// 	}),
				// });
				//
				// if (!byeBye.ok) {
				// 	const errorMessage = `Failed to send goodbye message (${byeBye.status}): ${byeBye.statusText}`;
				// 	showError(errorMessage);
				// 	return;
				// }

				// setChatData(prev => ({
				// 	...prev,
				// 	messages: [toAppend, ...prev.messages]
				// }));

				// Force a complete refresh of chat data
				try {
					const refreshRes = await fetch(`/api/chats/${phone}?page=1&messages_count=20`, {
						method: 'GET',
						headers: {
							Accept: 'application/json',
							'Cache-Control': 'no-cache' // Prevent caching
						},
					});

					if (refreshRes.ok) {
						const refreshedData: ChatApiResponse = await refreshRes.json();
						setChatData(refreshedData);
					} else {
						console.warn('Failed to refresh chat data after de-escalation');
					}
				} catch (refreshError) {
					console.error('Error refreshing chat data:', refreshError);
				}
			}
		} catch (err) {
			console.error('Toggle error:', err);
			showError("Network error occurred. Please check your connection and try again.");
		} finally {
			setEscalationLoading(false);
		}
	};

	if (loading) {
		return <PageLoader text={"Loading Chat..."}/>
	}

	return (
		<div className={"flex flex-col flex-1 h-full!"}>
			<div className="flex justify-between items-center">
				<div className="flex gap-4 p-4 items-center">
					<BackButton/>
					<div className="flex items-center justify-self-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full text-white text-sm font-bold w-12 h-12 ">PS</div>
					<div className="flex flex-col gap-2">
						<div className="font-semibold text-xl">{customerName}</div>
						<div className="text-sm text-neutral-500">{formatPakPhone(chatData.phone_number)}</div>
					</div>
				</div>

				<div className="flex flex-col gap-2 items-center px-4 mx-2">
					<div className="text-neutral-500">Escalation</div>
					{escalationLoading ? <Spinner/> :
						isEscalated !== null && <ToggleSwitch
                            size="md"
                            checked={!!isEscalated}
                            onChange={handleToggle}
                            disabled={escalationLoading}
                        />

					}
				</div>
			</div>

			<div className="flex flex-row h-full overflow-y-hidden">
				<ChatList
					chat={chatData}
					escalationStatus={isEscalated === true}
					repName={repName} // Pass the rep name to ChatList
				/>
				<PropertiesPanel  phone={phone} escalationStatus={isEscalated}/>
			</div>

			{/* Show toast when there's an error */}
			<Toast
				type={"error"}
				message={error || "An error occurred"}
				show={showToast && error !== null}
				onClose={() => {
					setShowToast(false);
					setError(null);
				}}
			/>
		</div>
	)
}