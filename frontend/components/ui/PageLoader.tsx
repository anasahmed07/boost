import React from 'react';

interface PageLoaderProps {
	text?: string;
}

export default function PageLoader({
	text = "Loading...",
}: PageLoaderProps) {

	return (
		<div className={"min-h-screen flex flex-col items-center justify-center"}>
			<div className="w-max flex flex-col items-center gap-6">
				<div className="relative">
					<div className={`w-8 h-8 border-2 border-yellow-200 rounded-full`}></div>
					<div className={`absolute top-0 left-0 w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin`}></div>
					<div className={`absolute top-1 left-1 w-6 h-6 border-2 border-yellow-400 border-b-transparent rounded-full animate-spin`} style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
				</div>
				<span className="text-gray-600 font-medium">{text}</span>
			</div>
		</div>
	);
}