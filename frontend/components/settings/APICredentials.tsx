"use client";

import { useState } from 'react';
import { Key } from 'lucide-react';

interface ApiCredentials {
	whatsappToken: string;
	openaiKey: string;
	phoneNumberId: string;
}

interface ApiCredentialsProps {
	initialCredentials?: Partial<ApiCredentials>;
	onSave?: (credentials: ApiCredentials) => void;
}

export default function ApiCredentialsBox({
											  initialCredentials = {},
											  onSave
										  }: ApiCredentialsProps) {
	const [credentials, setCredentials] = useState<ApiCredentials>({
		whatsappToken: initialCredentials.whatsappToken || '••••••••••••••••••••••••••••••••',
		openaiKey: initialCredentials.openaiKey || '••••••••••••••••••••••••••••••••',
		phoneNumberId: initialCredentials.phoneNumberId || '123456789012345'
	});

	const handleSave = () => {
		onSave?.(credentials);
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-6">
			<div className="flex items-center gap-3 mb-4">
				<div className="p-2 bg-yellow-100 rounded-lg">
					<Key className="w-5 h-5 text-yellow-600" />
				</div>
				<div>
					<h2 className="text-xl font-semibold text-gray-900">API Credentials</h2>
					<p className="text-sm text-gray-600">Configure your external API keys and credentials</p>
				</div>
			</div>

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						WhatsApp Business API Token
					</label>
					<input
						type="password"
						value={credentials.whatsappToken}
						onChange={(e) => setCredentials(prev => ({...prev, whatsappToken: e.target.value}))}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						OpenAI API Key
					</label>
					<input
						type="password"
						value={credentials.openaiKey}
						onChange={(e) => setCredentials(prev => ({...prev, openaiKey: e.target.value}))}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						WhatsApp Phone Number ID
					</label>
					<input
						type="text"
						value={credentials.phoneNumberId}
						onChange={(e) => setCredentials(prev => ({...prev, phoneNumberId: e.target.value}))}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
					/>
				</div>

				<button
					onClick={handleSave}
					className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
				>
					Save API Credentials
				</button>
			</div>
		</div>
	);
}