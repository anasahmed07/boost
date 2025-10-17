import React from "react";
import { Volume2, Play, Pause } from "lucide-react";
// import Image from "next/image";

interface ChatMessage {
	sender: string;
	time_stamp: string;
	content: string;
	message_type: string;
}

const formatDateTime = (timestamp: string) => {
	const date = new Date(timestamp);
	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
};

const ChatBubble = ({message}: {message: ChatMessage}) => {

	// console.log("building chat bubble",  message.content)

	const [isPlaying, setIsPlaying] = React.useState(false);
	const [currentTime, setCurrentTime] = React.useState(0);
	const [duration, setDuration] = React.useState(0);
	const audioRef = React.useRef<HTMLAudioElement>(null);

	const time = formatDateTime(message.time_stamp);
	const isUser = message.sender === "customer";
	const isRep = message.sender === "representative";

	const handlePlayPause = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause();
			} else {
				audioRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
		}
	};

	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = parseFloat(e.target.value);
		if (audioRef.current) {
			audioRef.current.currentTime = newTime;
			setCurrentTime(newTime);
		}
	};

	const formatTime = (timeInSeconds: number) => {
		if (isNaN(timeInSeconds)) return '0:00';
		const minutes = Math.floor(timeInSeconds / 60);
		const seconds = Math.floor(timeInSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	const renderContent = () => {
		switch (message.message_type) {
			case "image":
				let imageUrl = message.content;
				let caption = '';

				if (message.content.includes('![') && message.content.includes('](')) {
					const urlMatch = message.content.match(/!\[([\s\S]*?)\]\((.*?)\)/);
					if (urlMatch) {
						caption = urlMatch[1]?.trim() || "";
						imageUrl = urlMatch[2]?.trim() || "";
					}
				}

				imageUrl = imageUrl.replace(/\?$/, '');

				return (
					<div className="max-w-sm">
						<img
							height={600}
							width={600}
							src={imageUrl}
							alt={caption || "Shared image"}
							className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
							onClick={() => window.open(imageUrl, '_blank')}
							onError={(e) => {
								e.currentTarget.style.display = 'none';
								const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
								if (errorDiv) {
									errorDiv.style.display = 'block';
								}
							}}
						/>
						{caption && (
							<div className="mt-2 text-base text-neutral-800">
								{caption}
							</div>
						)}
						<div className="text-red-500 text-sm hidden">
							Failed to load image: {imageUrl}
						</div>
					</div>
				);

			case "audio":
				let audioUrl = message.content;
				let transcription = '';

				// Extract transcription and URL from markdown format [transcription](URL)
				if (message.content.includes('[') && message.content.includes('](')) {
					const audioMatch = message.content.match(/\[([\s\S]*?)\]\((.*?)\)/);
					if (audioMatch) {
						transcription = audioMatch[1]?.trim() || "";
						audioUrl = audioMatch[2]?.trim() || "";
					}
				}

				// Clean up URL
				audioUrl = audioUrl.replace(/\?$/, '');

				return (
					<div className="max-w-md">
						<div className="bg-white rounded-lg p-4 shadow-md">
							<div className="flex items-center gap-3 mb-2">
								<button
									onClick={handlePlayPause}
									className="flex-shrink-0 w-12 h-12 bg-yellow-400 hover:bg-yellow-500 rounded-full flex items-center justify-center text-white transition-colors shadow-md cursor-pointer"
								>
									{isPlaying ? (
										<Pause size={20} fill="white" />
									) : (
										<Play size={20} fill="white" className="ml-0.5" />
									)}
								</button>
								
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-2">
										<Volume2 size={16} className={isPlaying ? "text-yellow-500" : "text-yellow-800"} />
										<span className={`text-xs font-semibold ${isPlaying ? "text-yellow-500" : "text-yellow-800"}`}>Voice Message</span>
										<span className={`text-xs ${isPlaying ? "text-yellow-500" : "text-yellow-800"} ml-auto`}>
											{formatTime(currentTime)} / {formatTime(duration)}
										</span>
									</div>
									<audio
										ref={audioRef}
										src={audioUrl}
										onEnded={() => setIsPlaying(false)}
										onPlay={() => setIsPlaying(true)}
										onPause={() => setIsPlaying(false)}
										onTimeUpdate={handleTimeUpdate}
										onLoadedMetadata={handleLoadedMetadata}
										className="w-full"
										style={{ display: 'none' }}
									/>
									<input
										type="range"
										min="0"
										max={duration || 0}
										value={currentTime}
										onChange={handleSeek}
										className="w-full h-2 bg-yellow-600 bg-opacity-30 rounded-full appearance-none cursor-pointer"
										style={{
											background: `linear-gradient(to right, rgb(133 77 14) 0%, rgb(133 77 14) ${(currentTime / duration) * 100}%, rgb(202 138 4 / 0.3) ${(currentTime / duration) * 100}%, rgb(202 138 4 / 0.3) 100%)`
										}}
									/>
								</div>

								<a
									href={audioUrl}
									download
									target="_blank"
									rel="noopener noreferrer"
									className="flex-shrink-0 text-yellow-800 hover:text-yellow-900 transition-colors"
									title="Download audio"
								>
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="7 10 12 15 17 10" />
										<line x1="12" y1="15" x2="12" y2="3" />
									</svg>
								</a>
							</div>

							{transcription && (
								<div className="bg-neutral-200 bg-opacity-20 rounded-md p-3 mt-2">
									<div className="text-xs font-semibold text-neutral-800 mb-1">Transcription:</div>
									<div className="text-sm text-neutral-800leading-relaxed">
										&quot;{transcription}&quot;
									</div>
								</div>
							)}
						</div>
					</div>
				);

			case "video":
				let videoUrl = message.content;
				let videoCaption = '';

				// Extract video URL from markdown format ![caption](URL)
				if (message.content.includes('![') && message.content.includes('](')) {
					const videoMatch = message.content.match(/!\[([\s\S]*?)\]\((.*?)\)/);
					if (videoMatch) {
						videoCaption = videoMatch[1]?.trim() || "";
						videoUrl = videoMatch[2]?.trim() || "";
					}
				}

				// Clean up URL
				videoUrl = videoUrl.replace(/\?$/, '');

				return (
					<div className="max-w-md">
						<video
							controls
							className="rounded-lg max-w-full h-auto shadow-md"
							preload="metadata"
							onError={(e) => {
								e.currentTarget.style.display = 'none';
								const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
								if (errorDiv) {
									errorDiv.style.display = 'block';
								}
							}}
						>
							<source src={videoUrl} type="video/mp4" />
							Your browser does not support the video element.
						</video>
						{videoCaption && (
							<div className="mt-2 text-xs text-gray-600 italic w-full text-wrap break-words">
								{videoCaption}
							</div>
						)}
						<div className="text-red-500 text-sm hidden">
							Failed to load video: {videoUrl}
						</div>
					</div>
				);

			case "document":
				let documentUrl = message.content;
				let documentName = 'Document';

				if (message.content.includes('](')) {
					const docMatch = message.content.match(/\[(.*?)\]\((.*?)\)/);
					if (docMatch && docMatch[2]) {
						documentName = docMatch[1] || 'Document';
						documentUrl = docMatch[2];
					}
				} else {
					const urlParts = documentUrl.split('/');
					const fileName = urlParts[urlParts.length - 1];
					if (fileName && fileName.includes('.')) {
						documentName = decodeURIComponent(fileName);
					}
				}

				const getFileExtension = (filename: string) => {
					return filename.split('.').pop()?.toLowerCase() || '';
				};

				const fileExtension = getFileExtension(documentName);

				return (
					<div className="max-w-sm border border-gray-300 rounded-lg p-3 bg-gray-50">
						<div className="flex items-center gap-3">
							<div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-bold uppercase">
								{fileExtension || 'DOC'}
							</div>

							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium text-gray-900 truncate">
									{documentName}
								</div>
								<div className="text-xs text-gray-500">
									{fileExtension ? `${fileExtension.toUpperCase()} file` : 'Document'}
								</div>
							</div>

							<a
								href={documentUrl}
								download={documentName}
								target="_blank"
								rel="noopener noreferrer"
								className="flex-shrink-0 px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors cursor-pointer"
							>
								Download
							</a>
						</div>
					</div>
				);

			case "text":
			default:
				return (
					<div className="text-base whitespace-pre-wrap break-words leading-5">
						{message.content}
					</div>
				);
		}
	};

	return (
		<div
			className={`flex flex-col gap-2 p-3 rounded-md shadow-sm w-max max-w-7/10 selection:bg-rose-500 selection:text-black ${
				isUser
					? "self-start bg-white"
					: isRep
						? "self-end bg-yellow-200"
						: "self-end bg-emerald-200"
			}`}
		>
			<div className="text-xs">
				<span className="capitalize text-red-500">{message.sender}</span> • <span className="text-neutral-500">{time}</span>
			</div>
			{renderContent()}
		</div>
	);
};

export default ChatBubble;