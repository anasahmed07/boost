"use client";

import { SendHorizonal, Paperclip, ChevronDown, FileText } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import ChatBubble from "@/components/ui/ChatBubble";
import Spinner from "@/components/ui/Spinner";
import Toast from "@/components/ui/Toast";

interface ChatProps {
	chat: {
		messages: ChatMessage[];
		phone_number: string;
	};
	escalationStatus: boolean;
	repName?: string;
}

function ChatList({ chat, escalationStatus, repName = "Support Agent" }: ChatProps) {
	// State
	const [messages, setMessages] = useState<ChatMessage[]>([...chat.messages].reverse());
	const [inputValue, setInputValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
	const [showQuickMessages, setShowQuickMessages] = useState(false);
	const [uploadingFile, setUploadingFile] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

	// Refs
	const containerRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const documentInputRef = useRef<HTMLInputElement>(null);
	const quickMessagesRef = useRef<HTMLDivElement>(null);
	const isLoadingOlderRef = useRef(false);
	const initialScrollDone = useRef(false);

	const maxReconnectAttempts = 5;

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		setToast({ message, type });
	};

	const hideToast = () => {
		setToast(null);
	};

	const quickMessages = [
		`Hi, I am ${repName}, how may I assist you today?`,
		"Thank you for contacting us. I'll be happy to help you with your inquiry.",
		"I understand your concern. Let me look into this for you right away.",
		"Could you please provide more details about the issue you're experiencing?",
		"I apologize for any inconvenience this may have caused.",
		"Is there anything else I can help you with today?",
		"Thank you for your patience while I resolve this for you.",
		"Your issue has been resolved. Please let me know if you need any further assistance."
	];

	// Scroll to bottom - only call this manually when needed
	const scrollToBottom = useCallback(() => {
		if (bottomRef.current) {
			bottomRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, []);

	const fetchOlderMessages = useCallback(async () => {
		if (isLoadingOlderRef.current || !hasMore) return;

		isLoadingOlderRef.current = true;
		setLoadingOlder(true);

		const container = containerRef.current;
		if (!container) {
			isLoadingOlderRef.current = false;
			setLoadingOlder(false);
			return;
		}

		// Save current scroll position
		const currentScrollHeight = container.scrollHeight;
		const currentScrollTop = container.scrollTop;

		try {
			const nextPage = page + 1;
			const res = await fetch(
				`/api/chats/${chat.phone_number}?page=${nextPage}&messages_count=20`
			);

			if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

			const data = await res.json();

			if (!data.messages || data.messages.length === 0) {
				setHasMore(false);
			} else {
				const olderMessages = [...data.messages].reverse();

				// Add older messages to the beginning
				setMessages((prev) => [...olderMessages, ...prev]);
				setPage(nextPage);

				// Restore scroll position after DOM updates
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						if (container) {
							const newScrollHeight = container.scrollHeight;
							const scrollDiff = newScrollHeight - currentScrollHeight;
							container.scrollTop = currentScrollTop + scrollDiff;
						}
					});
				});
			}
		} catch (error) {
			console.error(error);
			showToast("Error loading older messages", 'error');
		} finally {
			setTimeout(() => {
				isLoadingOlderRef.current = false;
				setLoadingOlder(false);
			}, 300);
		}
	}, [chat.phone_number, hasMore, page])

	// Initial scroll to bottom on mount
	useEffect(() => {
		if (!initialScrollDone.current) {
			setTimeout(() => {
				if (bottomRef.current) {
					bottomRef.current.scrollIntoView({ behavior: "auto" });
					initialScrollDone.current = true;
				}
			}, 100);
		}
	}, []);

	// Handle scroll to detect top
	const handleScroll = useCallback(() => {
		const container = containerRef.current;
		if (!container || loadingOlder || !hasMore || isLoadingOlderRef.current) return;

		if (container.scrollTop < 100) {
			void fetchOlderMessages();
		}
	}, [loadingOlder, hasMore, fetchOlderMessages]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		container.addEventListener('scroll', handleScroll);
		return () => container.removeEventListener('scroll', handleScroll);
	}, [handleScroll]);

	// Fetch older messages


	// WebSocket connection
	const connectWebSocket = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		try {
			const wsUri = `${process.env.NEXT_PUBLIC_WEBSOCKET_URI ?? ""}/ws/${chat.phone_number}`;
			setWsStatus('connecting');
			const ws = new WebSocket(wsUri);
			wsRef.current = ws;

			const connectionTimeout = setTimeout(() => {
				if (ws.readyState !== WebSocket.OPEN) {
					ws.close();
				}
			}, 10000);

			ws.onopen = () => {
				clearTimeout(connectionTimeout);
				setWsStatus('connected');
				reconnectAttemptsRef.current = 0;
			};

			ws.onmessage = (event) => {
				try {
					const msg: ChatMessage = JSON.parse(event.data);
					setMessages((prev) => {
						const exists = prev.some(
							(m) => m.sender === msg.sender &&
								m.time_stamp === msg.time_stamp &&
								m.content === msg.content
						);
						if (exists) return prev;

						// New message arrived, scroll to bottom
						setTimeout(() => scrollToBottom(), 100);
						return [...prev, msg];
					});
				} catch (error) {
					console.log('Error parsing WebSocket message:', error);
				}
			};

			ws.onclose = (event) => {
				clearTimeout(connectionTimeout);
				setWsStatus('disconnected');

				if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
					reconnectTimeoutRef.current = setTimeout(() => {
						reconnectAttemptsRef.current++;
						connectWebSocket();
					}, delay);
				}
			};

			ws.onerror = (error) => {
				clearTimeout(connectionTimeout);
				console.error('WebSocket error:', error);
				setWsStatus('error');
			};
		} catch (error) {
			console.error('Failed to create WebSocket:', error);
			setWsStatus('error');
		}
	}, [chat.phone_number, scrollToBottom]);

	useEffect(() => {
		connectWebSocket();

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
				wsRef.current.close(1000, 'Component unmounting');
			}
		};
	}, [connectWebSocket]);

	// Update messages when chat changes
	useEffect(() => {
		setMessages([...chat.messages].reverse());
		initialScrollDone.current = false;
	}, [chat.messages]);

	// Close quick messages dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (quickMessagesRef.current && !quickMessagesRef.current.contains(event.target as Node)) {
				setShowQuickMessages(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const getEscalationPermission = (messages: ChatMessage[]) => {
		if (!messages[0]) return false;
		for (let i = 0; i < messages.length; i++) {
			if (messages[i].sender !== "customer") continue;
			const ts = new Date(messages[i].time_stamp).getTime();
			const now = Date.now();
			const tfh = 23 * 60 * 60 * 1000;
			if ((now - ts) > tfh) return false;
			return true;
		}
		return false;
	};

	const addMessage = async (messageContent?: string) => {
		const content = messageContent || inputValue;
		if (loading || uploadingFile || !escalationStatus || !content.trim()) return;

		setLoading(true);

		const permission = getEscalationPermission(chat.messages);
		if (!permission) {
			showToast("Cannot send message due to last customer message being more than 23 hours ago.", "error");
			setLoading(false);
			return;
		}

		const newMessage: ChatMessage = {
			content,
			message_type: "text",
			sender: "representative",
			time_stamp: new Date().toISOString(),
		};

		try {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(content);
				setMessages((prev) => [...prev, newMessage]);
				if (!messageContent) setInputValue("");
				scrollToBottom();
			} else {
				const response = await fetch(`/api/chats/${chat.phone_number}/send`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content, sender: "representative" }),
				});

				if (response.ok) {
					setMessages((prev) => [...prev, newMessage]);
					if (!messageContent) setInputValue("");
					scrollToBottom();
				} else {
					const errorData = await response.json().catch(() => ({}));
					showToast(`Error: ${errorData.message || "Failed to send message"}`, 'error');
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			showToast(`Network error: ${errorMessage}`, 'error');
		} finally {
			setLoading(false);
		}
	};

	const getMessageType = (fileType: string): string => {
		if (fileType.startsWith('image/')) return 'image';
		if (fileType.startsWith('audio/')) return 'audio';
		if (fileType.startsWith('video/')) return 'video';
		return 'document';
	};

	const uploadFile = async (file: File) => {
		const maxSize = 16 * 1024 * 1024;
		if (file.size > maxSize) {
			showToast('File size must be less than 16MB.', 'error');
			return;
		}

		setUploadingFile(true);

		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('sender', 'representative');

			const response = await fetch(`/api/chats/${chat.phone_number}/send-media`, {
				method: 'POST',
				body: formData,
			});

			if (response.ok) {
				const result = await response.json();
				const fileMessage: ChatMessage = {
					content: `![${result.fileName || file.name}](${result.url || result.fileName})`,
					message_type: getMessageType(file.type),
					sender: "representative",
					time_stamp: new Date().toISOString(),
				};

				setMessages((prev) => [...prev, fileMessage]);
				showToast(`File uploaded successfully!`, 'success');
				scrollToBottom();
			} else {
				const errorData = await response.json().catch(() => ({}));
				showToast(`Upload failed: ${errorData.error || 'Unknown error'}`, 'error');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Upload failed";
			showToast(`Upload error: ${errorMessage}`, 'error');
		} finally {
			setUploadingFile(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
			if (documentInputRef.current) documentInputRef.current.value = '';
		}
	};

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const allowedTypes = [
			'image/jpeg', 'image/png', 'image/gif', 'image/webp',
			'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'
		];

		if (!allowedTypes.includes(file.type)) {
			showToast('Please select an image or audio file only.', 'error');
			return;
		}

		await uploadFile(file);
	};

	const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const allowedDocTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/plain',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation'
		];

		if (!allowedDocTypes.includes(file.type)) {
			showToast('Please select a document file (PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX).', 'error');
			return;
		}

		await uploadFile(file);
	};

	const handleQuickMessageSelect = (message: string) => {
		setInputValue(message);
		setShowQuickMessages(false);
	};

	const handleReconnect = () => {
		reconnectAttemptsRef.current = 0;
		connectWebSocket();
	};

	return (
		<div className="flex flex-col h-full overflow-y-hidden flex-1">
			{/* Status bar */}
			<div className="bg-neutral-50 px-4 py-1 text-xs flex justify-between items-center ">
				<span className="flex items-center gap-1">
					<span className={`w-2 h-2 rounded-full ${
						wsStatus === 'connected' ? 'bg-green-500' :
							wsStatus === 'connecting' ? 'bg-yellow-500' :
								'bg-red-500'
					}`} />
					<span className="text-gray-600">
						{wsStatus === 'connected' ? 'Connected' :
							wsStatus === 'connecting' ? 'Connecting...' :
								'Disconnected'}
					</span>
				</span>
				{wsStatus !== 'connected' && wsStatus !== 'connecting' && (
					<button onClick={handleReconnect} className="text-yellow-400 hover:text-yellow-600 duration-200">
						Reconnect
					</button>
				)}
			</div>

			{/* Messages container */}
			<div
				ref={containerRef}
				className="p-5 gap-5 bg-neutral-100 overflow-y-scroll overflow-x-hidden h-full flex flex-col texture-mosaic relative"
			>
				{loadingOlder && (
					<div className="flex w-full justify-center py-2 sticky top-0 z-10">
						<Spinner />
					</div>
				)}

				{!hasMore && !loadingOlder && (
					<div className="text-center text-xs text-gray-500 py-2">
						No more messages
					</div>
				)}

				{messages.map((msg: ChatMessage, i: number) => {
					return <ChatBubble message={msg} key={`${msg.time_stamp}-${i}`}/>
				})}

				<div ref={bottomRef} />
			</div>

			{/* Input area */}
			{escalationStatus ? (
				<div className="sticky bottom-0 p-4 bg-white">
					<div className="relative mb-2" ref={quickMessagesRef}>
						<button
							onClick={() => setShowQuickMessages(!showQuickMessages)}
							className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<span>Quick Messages</span>
							<ChevronDown
								size={16}
								className={`transform transition-transform ${showQuickMessages ? 'rotate-180' : ''}`}
							/>
						</button>

						{showQuickMessages && (
							<div className="absolute bottom-full mb-2 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
								{quickMessages.map((message, index) => (
									<button
										key={index}
										onClick={() => handleQuickMessageSelect(message)}
										className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
									>
										{message}
									</button>
								))}
							</div>
						)}
					</div>

					<div className="flex gap-2 items-center">
						<div className="relative">
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*,audio/*,video/*"
								onChange={handleFileUpload}
								className="hidden"
								disabled={loading || uploadingFile}
							/>
							<button
								onClick={() => fileInputRef.current?.click()}
								disabled={loading || uploadingFile}
								className="p-3 rounded-full flex items-center justify-center text-black border border-neutral-400 bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Upload image, audio, or video"
							>
								{uploadingFile ? <Spinner /> : <Paperclip size={20} />}
							</button>
						</div>

						<div className="relative">
							<input
								ref={documentInputRef}
								type="file"
								accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
								onChange={handleDocumentUpload}
								className="hidden"
								disabled={loading || uploadingFile}
							/>
							<button
								onClick={() => documentInputRef.current?.click()}
								disabled={loading || uploadingFile}
								className="p-3 rounded-full flex items-center justify-center text-black border border-neutral-400 bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Upload document"
							>
								{uploadingFile ? <Spinner /> : <FileText size={20} />}
							</button>
						</div>

						<input
							type="text"
							className="w-full p-3 leading-none bg-neutral-100 rounded-full font-semibold border border-neutral-400 focus:outline-1 focus:outline-neutral-400"
							placeholder="Type a message"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									addMessage();
								}
							}}
							disabled={loading || uploadingFile}
						/>

						<div className="hover:shadow-xl rounded-full duration-200">
							{loading ? (
								<div className="p-4">
									<Spinner />
								</div>
							) : (
								<button
									className="p-4 rounded-full flex items-center justify-center text-black border border-neutral-400 bg-neutral-100 hover:bg-neutral-200 transition-colors"
									onClick={() => addMessage()}
									disabled={uploadingFile}
								>
									<SendHorizonal size={25} />
								</button>
							)}
						</div>
					</div>
				</div>
			) : (
				<div className="sticky bottom-0 p-4 bg-neutral-200 text-neutral-600">
					This chat isn&#39;t escalated yet. Toggle the escalation status switch at the top to escalate the chat.
				</div>
			)}

			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					show={!!toast}
					onClose={hideToast}
					duration={5000}
				/>
			)}
		</div>
	);
}

export default React.memo(ChatList);