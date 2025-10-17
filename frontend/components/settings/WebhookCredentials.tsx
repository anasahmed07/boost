"use client";


import { useState } from 'react';
import { Webhook } from 'lucide-react';

interface WebhookConfig {
	url: string;
	secret: string;
	enabled: boolean;
}

interface WebhookConfigProps {
	initialConfig?: Partial<WebhookConfig>;
	onUpdate?: (config: WebhookConfig) => void;
}

export default function WebhookConfigBox({
											 initialConfig = {},
											 onUpdate
										 }: WebhookConfigProps) {
	const [config, setConfig] = useState<WebhookConfig>({
		url: initialConfig.url || 'https://api.yourdomain.com/webhook',
		secret: initialConfig.secret || '•••••••••••••••••••',
		enabled: initialConfig.enabled ?? true
	});

	const handleUpdate = () => {
		onUpdate?.(config);
	};

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-6">
			<div className="flex items-center gap-3 mb-4">
				<div className="p-2 bg-yellow-100 rounded-lg">
					<Webhook className="w-5 h-5 text-yellow-600" />
				</div>
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Webhook Configuration</h2>
					<p className="text-sm text-gray-600">Configure webhook endpoints for real-time updates</p>
				</div>
			</div>

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Webhook URL
					</label>
					<input
						type="url"
						value={config.url}
						onChange={(e) => setConfig(prev => ({...prev, url: e.target.value}))}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Webhook Secret
					</label>
					<input
						type="password"
						value={config.secret}
						onChange={(e) => setConfig(prev => ({...prev, secret: e.target.value}))}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
					/>
				</div>

				<div className="flex items-center gap-3">
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={config.enabled}
							onChange={(e) => setConfig(prev => ({...prev, enabled: e.target.checked}))}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
					</label>
					<span className="text-sm font-medium text-gray-700">
            Enable webhook notifications
          </span>
				</div>

				<button
					onClick={handleUpdate}
					className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
				>
					Update Webhook Settings
				</button>
			</div>
		</div>
	);
}