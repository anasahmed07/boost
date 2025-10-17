'use client';

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
	Upload,
	Plus,
	RefreshCw,
	FileText,
	Search,
	EllipsisVertical,
	Trash2
} from 'lucide-react';

interface Document {
	id: string;
	name: string;
	created_at: number;
	status: 'completed' | 'failed' | 'in_progress';
	usage_bytes: number;
	last_error?: {
		code: string;
		message: string;
	} | null;
	object: string;
	vector_store_id: string;
}

interface DocumentsData {
	store_name: string;
	files: Document[];
}

interface ToastState {
	show: boolean;
	message: string;
	type: 'success' | 'error';
}

export default function DocumentUpload() {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
	const [showUploadForm, setShowUploadForm] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		setToast({ show: true, message, type });
		setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-700';
			case 'failed':
				return 'bg-red-100 text-red-700';
			case 'in_progress':
				return 'bg-yellow-100 text-yellow-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const toggleDropdown = (docId: string) => {
		setActiveDropdown(activeDropdown === docId ? null : docId);
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (activeDropdown !== null) {
				const dropdownElement = dropdownRefs.current[activeDropdown];
				if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
					setActiveDropdown(null);
				}
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [activeDropdown]);

	const fetchDocuments = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/documents/list');

			if (!response.ok) {
				throw new Error('Failed to fetch documents');
			}

			const data: DocumentsData = await response.json();
			setDocuments(data.files || []);
			setTotal(data.files.length || 0);
			setFilteredDocuments(data.files || []);
		} catch (error) {
			showToast('Failed to load documents', 'error');
			console.error('Error fetching documents:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setSelectedFile(file);
	};

	const handleUpload = async () => {
		if (!selectedFile) {
			showToast('Please select a file first', 'error');
			return;
		}

		try {
			setUploading(true);
			const formData = new FormData();
			formData.append('file', selectedFile);

			const response = await fetch('/api/upload/documents', {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();

			if (response.ok) {
				showToast('File uploaded successfully!');
				setSelectedFile(null);
				setShowUploadForm(false);
				const fileInput = document.getElementById('file-input') as HTMLInputElement;
				if (fileInput) fileInput.value = '';
				await fetchDocuments();
			} else {
				showToast(`Upload failed: ${result.error}`, 'error');
			}
		} catch (error) {
			console.log(error);
			showToast('Upload failed: Network error', 'error');
		} finally {
			setUploading(false);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		const droppedFile = e.dataTransfer.files?.[0] || null;
		if (droppedFile) {
			setSelectedFile(droppedFile);
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	const deleteDocument = async (doc: Document) => {
		if (!confirm(`Are you sure you want to delete this document?\n\nFile: ${doc.name}\n\nThis action cannot be undone.`)) {
			return;
		}

		setDeletingId(doc.id);
		try {
			const response = await fetch(`/api/documents/${doc.id}/delete`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error('Failed to delete document');
			}

			await fetchDocuments();
			showToast('Document deleted successfully');
			setActiveDropdown(null);
		} catch (error) {
			showToast('Failed to delete document', 'error');
			console.error('Error deleting document:', error);
		} finally {
			setDeletingId(null);
		}
	};

	const filterDocuments = useCallback(() => {
		let filtered = documents;

		if (searchTerm.trim()) {
			filtered = filtered.filter(doc =>
				doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				doc.status.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		setFilteredDocuments(filtered);
	}, [documents, searchTerm]);

	useEffect(() => {
		fetchDocuments();
	}, [fetchDocuments]);

	useEffect(() => {
		filterDocuments();
	}, [filterDocuments]);

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<RefreshCw className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-4" />
					<p className="text-gray-600">Loading documents...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Documents</h1>
							<p className="text-gray-600">Manage your document library</p>
						</div>
						<button
							onClick={() => setShowUploadForm(!showUploadForm)}
							className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200"
						>
							<Plus className="w-5 h-5" />
							Upload Document
						</button>
					</div>

					{/* Search */}
					<div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Search documents..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
							/>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div className="bg-white rounded-lg shadow-sm border p-4">
							<div className="flex items-center gap-2">
								<FileText className="w-5 h-5 text-blue-500" />
								<span className="text-sm font-medium text-gray-600">Total Documents</span>
							</div>
							<p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border p-4">
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 bg-green-500 rounded-full" />
								<span className="text-sm font-medium text-gray-600">Completed</span>
							</div>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{documents.filter(doc => doc.status === 'completed').length}
							</p>
						</div>
						<div className="bg-white rounded-lg shadow-sm border p-4">
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 bg-red-500 rounded-full" />
								<span className="text-sm font-medium text-gray-600">Failed</span>
							</div>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{documents.filter(doc => doc.status === 'failed').length}
							</p>
						</div>
					</div>
				</div>

				{/* Upload Form */}
				{showUploadForm && (
					<div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h3>

						<div
							className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-yellow-400 transition-colors mb-4"
							onDrop={handleDrop}
							onDragOver={handleDragOver}
						>
							<Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

							<p className="text-gray-600 mb-4">
								Drop files here or{' '}
								<label htmlFor="file-input" className="text-yellow-600 underline cursor-pointer hover:text-yellow-700">
									browse
								</label>
							</p>

							<input
								id="file-input"
								type="file"
								onChange={handleFileChange}
								className="hidden"
								accept=".pdf,.txt,.doc,.docx"
							/>

							{selectedFile && (
								<div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
									📄 {selectedFile.name}
								</div>
							)}
						</div>

						<div className="flex justify-end gap-3 pt-4 border-t">
							<button
								onClick={() => setShowUploadForm(false)}
								className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
							>
								Cancel
							</button>
							<button
								onClick={handleUpload}
								disabled={!selectedFile || uploading}
								className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
							>
								{uploading ? (
									<RefreshCw className="w-4 h-4 animate-spin" />
								) : (
									<Upload className="w-4 h-4" />
								)}
								{uploading ? 'Uploading...' : 'Upload Document'}
							</button>
						</div>
					</div>
				)}

				{/* Documents List */}
				<div className="space-y-4">
					{filteredDocuments.length === 0 ? (
						<div className="bg-white rounded-lg shadow-sm border p-8 text-center">
							<FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
							<p className="text-gray-600">
								{documents.length === 0
									? "Get started by uploading your first document."
									: "Try adjusting your search criteria."
								}
							</p>
						</div>
					) : (
						filteredDocuments.map((doc) => (
							<div key={doc.id} className="bg-white rounded-lg shadow-sm border p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<FileText className="w-5 h-5 text-blue-500" />
											<span className="text-sm font-medium text-gray-600">Document</span>
											<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(doc.status)}`}>
												{doc.status}
											</span>
										</div>
										<h3 className="text-lg font-semibold text-gray-900 mb-2">
											{doc.name}
										</h3>
										<div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
											<span>Size: {formatFileSize(doc.usage_bytes)}</span>
											<span>Uploaded: {formatDate(doc.created_at)}</span>
										</div>
										{doc.last_error && (
											<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
												<span className="text-red-600 font-medium">Error: </span>
												<span className="text-red-700">{doc.last_error.message}</span>
											</div>
										)}
									</div>

									{/* Dropdown Menu */}
									<div className="relative" ref={el => {
										dropdownRefs.current[doc.id] = el;
									}}>
										<div
											className="flex cursor-pointer hover:shadow-sm duration-100 p-1 rounded-md hover:bg-neutral-100"
											onClick={() => toggleDropdown(doc.id)}
										>
											<EllipsisVertical className="flex" size={16}/>
										</div>

										{activeDropdown === doc.id && (
											<div className="absolute right-0 top-8 bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-10 min-w-48">
												{/*<button*/}
												{/*	onClick={() => /!* Add download logic *!/}*/}
												{/*	className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"*/}
												{/*>*/}
												{/*	<Download size={14} />*/}
												{/*	Download*/}
												{/*</button>*/}
												<button
													onClick={() => deleteDocument(doc)}
													disabled={deletingId === doc.id}
													className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<Trash2 size={14} />
													{deletingId === doc.id ? 'Deleting...' : 'Delete'}
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
						))
					)}
				</div>

				{/* Refresh Button */}
				<div className="mt-8 flex justify-center">
					<button
						onClick={fetchDocuments}
						disabled={loading}
						className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					>
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
						Refresh Documents
					</button>
				</div>
			</div>

			{/* Toast */}
			{toast.show && (
				<div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
					toast.type === 'success'
						? 'bg-green-50 text-green-800 border border-green-200'
						: 'bg-red-50 text-red-800 border border-red-200'
				}`}>
					{toast.message}
				</div>
			)}
		</div>
	);
}