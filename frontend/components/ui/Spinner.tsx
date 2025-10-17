import {RefreshCw} from "lucide-react";
import React from "react";

interface SpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8'
	};

	return (
		<div
			className={`
        ${sizeClasses[size]}
        
        ${className}
      `}
			role="status"
			aria-label="Loading"
		>
			<RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
			<span className="sr-only">Loading...</span>
		</div>
	);
}