import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
	message: string;
	type?: 'success' | 'error';
	duration?: number;
	onClose?: () => void;
	show?: boolean;
}

export default function Toast({
								  message,
								  type = 'success',
								  duration = 10000,
								  onClose,
								  show = true
							  }: ToastProps) {
	const [isVisible, setIsVisible] = useState(show);

	// console.log("Toast render - show:", show, "isVisible:", isVisible, "message:", message);

	useEffect(() => {
		setIsVisible(show);
	}, [show]);

	const handleClose = useCallback(() => {
		setIsVisible(false);
		if (onClose) {
			setTimeout(onClose, 300); // Wait for animation to complete
		}
	}, [onClose]);

	useEffect(() => {
		if (isVisible && duration > 0) {
			const timer = setTimeout(() => {
				handleClose();
			}, duration);

			return () => clearTimeout(timer);
		}
	}, [isVisible, duration, handleClose]);

	if (!isVisible) return null;

	const getToastStyles = () => {
		const baseStyles = "z-20 fixed top-4 right-4 max-w-sm w-full bg-white border rounded-lg shadow-lg p-4 flex items-center gap-3 transform transition-all duration-300 ease-in-out z-50";

		if (type === 'error') {
			return `${baseStyles} border-red-200 bg-red-50`;
		}
		return `${baseStyles} border-green-200 bg-green-50`;
	};

	const getIcon = () => {
		if (type === 'error') {
			return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
		}
		return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
	};

	const getTextColor = () => {
		return type === 'error' ? 'text-red-800' : 'text-green-800';
	};

	return (
		<div className={getToastStyles()}>
			{getIcon()}
			<p className={`flex-1 text-sm font-medium ${getTextColor()}`}>
				{message}
			</p>
			<button
				onClick={handleClose}
				className={`flex-shrink-0 rounded-md p-1 hover:bg-gray-100 transition-colors ${
					type === 'error' ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'
				}`}
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
};