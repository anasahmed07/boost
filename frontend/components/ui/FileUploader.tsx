"use client";
import React, { useState } from "react";
import { Upload, File, X, Check, AlertCircle, Cloud } from "lucide-react";

export default function FileUploader() {
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploaded, setUploaded] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);

	// Allowed file types
	const allowedTypes = ['.txt', '.docx', '.pdf'];
	const allowedMimeTypes = [
		'text/plain',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/pdf'
	];

	const validateFile = (file: File): boolean => {
		// Check file extension
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		const hasValidExtension = allowedTypes.includes(fileExtension);

		// Check MIME type
		const hasValidMimeType = allowedMimeTypes.includes(file.type);

		return hasValidExtension && hasValidMimeType;
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const selectedFile = e.target.files[0];
			if (validateFile(selectedFile)) {
				setFile(selectedFile);
				setUploaded(false);
				setError(null);
			} else {
				setError("Only .txt, .docx, and .pdf files are allowed");
				setFile(null);
			}
		}
	};

	const handleUpload = async () => {
		if (!file) {
			setError("Please select a file first");
			return;
		}

		if (!validateFile(file)) {
			setError("Only .txt, .docx, and .pdf files are allowed");
			return;
		}

		setUploading(true);
		setError(null);

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Upload failed');
			}

			const result = await response.json();
			console.log('Upload successful:', result);

			setUploading(false);
			setUploaded(true);

			// Auto-clear success state after 3 seconds
			setTimeout(() => {
				setUploaded(false);
				setFile(null);
			}, 3000);
		} catch (error) {
			setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			setUploading(false);
		}
	};

	const removeFile = () => {
		setFile(null);
		setUploaded(false);
		setError(null);
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			const droppedFile = e.dataTransfer.files[0];
			if (validateFile(droppedFile)) {
				setFile(droppedFile);
				setUploaded(false);
				setError(null);
			} else {
				setError("Only .txt, .docx, and .pdf files are allowed");
				setFile(null);
			}
		}
	};

	return (
		<div className="max-w-md mx-auto space-y-4">
			{/* Main Upload Area */}
			<div
				className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer group ${
					dragActive
						? "border-blue-400 bg-blue-50 scale-[1.02]"
						: file
							? uploaded
								? "border-green-300 bg-green-50"
								: "border-blue-300 bg-blue-50"
							: "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
				}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={() => document.getElementById('file-input')?.click()}
			>
				<input
					id="file-input"
					type="file"
					accept=".txt,.docx,.pdf"
					onChange={handleFileChange}
					className="hidden"
				/>

				<div className="text-center">
					{file ? (
						<div className="space-y-3">
							<div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
								uploaded
									? "bg-green-100 scale-110"
									: "bg-blue-100"
							}`}>
								{uploaded ? (
									<Check className="w-8 h-8 text-green-600" />
								) : (
									<File className="w-8 h-8 text-blue-600" />
								)}
							</div>
							<div>
								<p className="text-sm font-semibold text-gray-900 truncate max-w-48">
									{file.name}
								</p>
							</div>
							{uploaded && (
								<div className="animate-pulse">
									<p className="text-sm text-green-600 font-semibold">
										Uploaded!
									</p>
								</div>
							)}
						</div>
					) : (
						<div className="space-y-4">
							<div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
								<Cloud className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
							</div>
							<div>
								<p className="text-base font-medium text-gray-700">
									Drop your file here, or{" "}
									<span className="text-blue-600 hover:text-blue-700 font-semibold">
                                        browse
                                    </span>
								</p>
								<p className="text-sm text-gray-500 mt-2">
									Upload to API
								</p>
								<p className="text-xs text-gray-400 mt-1">
									Only .txt, .docx, .pdf files
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Remove file button */}
				{file && !uploaded && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							removeFile();
						}}
						className="absolute top-4 right-4 w-8 h-8 bg-white shadow-md hover:bg-red-50 rounded-full flex items-center justify-center transition-all duration-200 group border border-gray-200 hover:border-red-200"
					>
						<X className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
					</button>
				)}
			</div>

			{/* Upload Button */}
			{file && !uploaded && (
				<button
					onClick={handleUpload}
					disabled={uploading}
					className={`w-full py-4 px-6 rounded-xl font-semibold text-black transition-all duration-300 transform ${
						uploading
							? "bg-gray-400 cursor-not-allowed scale-95"
							: "bg-yellow-400 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 active:scale-95"
					}`}
				>
					{uploading ? (
						<div className="flex items-center justify-center space-x-3">
							<div className="relative">
								<div className="w-5 h-5 border-2 border-white/30 rounded-full"></div>
								<div className="absolute top-0 left-0 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							</div>
							<span>Uploading...</span>
						</div>
					) : (
						<div className="flex items-center justify-center space-x-2">
							<Upload className="w-5 h-5" />
							<span>Upload to API</span>
						</div>
					)}
				</button>
			)}

			{/* Error Message */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-xl">
					<div className="flex items-center space-x-3">
						<div className="flex-shrink-0">
							<AlertCircle className="w-5 h-5 text-red-500" />
						</div>
						<div>
							<p className="text-sm font-medium text-red-800">Upload Error</p>
							<p className="text-sm text-red-700 mt-1">{error}</p>
						</div>
						<button
							onClick={() => setError(null)}
							className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* Success Message Auto-clears */}
			{uploaded && (
				<div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in duration-500">
					<div className="flex items-center space-x-3">
						<div className="flex-shrink-0">
							<Check className="w-5 h-5 text-green-500" />
						</div>
						<div>
							<p className="text-sm font-semibold text-green-800">
								File uploaded successfully!
							</p>
							<p className="text-sm text-green-700">
								This will clear automatically...
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}