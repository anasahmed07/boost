"use client";

import React, {useState, useEffect, useCallback} from 'react';
import { Eye, EyeOff, Save, AlertTriangle, Key, RefreshCw, MessageSquare, DollarSign, Zap, Package, Truck } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import {PageHeading} from "@/components/ui/Structure";
import PageLoader from "@/components/ui/PageLoader";

interface SecretsData {
	secrets: Record<string, string>;
}

interface ToastState {
	show: boolean;
	message: string;
	type: 'success' | 'error';
}

interface CredentialGroup {
	id: string;
	name: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	credentials: string[];
}

// Define credential groups
const CREDENTIAL_GROUPS: CredentialGroup[] = [
	{
		id: 'whatsapp',
		name: 'WhatsApp Business',
		description: 'WhatsApp Business API credentials',
		icon: MessageSquare,
		color: 'green',
		credentials: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_PHONE_NO_ID']
	},
	{
		id: 'quickbooks',
		name: 'QuickBooks',
		description: 'QuickBooks integration credentials',
		icon: DollarSign,
		color: 'blue',
		credentials: ['QB_CLIENT_ID', 'QB_CLIENT_SECRET', 'QB_REALM_ID', 'QB_ACCESS_TOKEN']
	},
	{
		id: 'openai',
		name: 'OpenAI',
		description: 'OpenAI API credentials',
		icon: Zap,
		color: 'purple',
		credentials: ['OPENAI_API_KEY']
	},
	{
		id: 'shopify',
		name: 'Shopify',
		description: 'Shopify store integration',
		icon: Package,
		color: 'emerald',
		credentials: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_SHOP_DOMAIN']
	},
	{
		id: 'shipping',
		name: 'Shipping Services',
		description: 'PostEx and Leopards courier services',
		icon: Truck,
		color: 'orange',
		credentials: ['POSTEX_API_TOKEN', 'LEOPARDS_API_KEY', 'LEOPARDS_API_PASSWORD']
	}
];


export default function SecretsManager() {

	const [secrets, setSecrets] = useState<Record<string, string>>({});
	const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		setToast({ show: true, message, type });
	};

	const hideToast = () => {
		setToast(prev => ({ ...prev, show: false }));
	};

	const fetchSecrets = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/secrets');

			if (!response.ok) {
				throw new Error('Failed to fetch secrets');
			}

			const data: SecretsData = await response.json();
			const fetchedSecrets = data.secrets || {};

			// Filter out unwanted keys from backend response
			const filteredSecrets: Record<string, string> = {};
			const allCredentials = CREDENTIAL_GROUPS.flatMap(group => group.credentials);

			allCredentials.forEach(key => {
				if (fetchedSecrets[key] !== undefined) {
					filteredSecrets[key] = fetchedSecrets[key];
				}
			});

			setSecrets(filteredSecrets);
		} catch (error) {
			showToast('Failed to load API credentials', 'error');
			console.error('Error fetching secrets:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	const saveGroupSecrets = async (groupId: string, groupCredentials: string[]) => {
		try {
			setSaving(prev => ({ ...prev, [groupId]: true }));

			// Prepare secrets array for this group
			const secretsToSave = groupCredentials
				.map(key => ({
					key,
					value: secrets[key] || ''
				}))
				.filter(secret => secret.value.trim() !== ''); // Only save non-empty values

			if (secretsToSave.length === 0) {
				showToast('No credentials to save in this group', 'error');
				return;
			}

			console.log(secretsToSave)

			const response = await fetch('/api/secrets/bulk', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ secrets: secretsToSave }),
			});

			if (!response.ok) {
				throw new Error('Failed to save secrets');
			}

			const group = CREDENTIAL_GROUPS.find(g => g.id === groupId);
			showToast(`${group?.name} credentials saved successfully`, 'success');
		} catch (error) {
			const group = CREDENTIAL_GROUPS.find(g => g.id === groupId);
			showToast(`Failed to save ${group?.name} credentials`, 'error');
			console.error('Error saving secrets:', error);
		} finally {
			setSaving(prev => ({ ...prev, [groupId]: false }));
		}
	};

	const toggleVisibility = (key: string) => {
		setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
	};

	const handleInputChange = (key: string, value: string) => {
		setSecrets(prev => ({ ...prev, [key]: value }));
	};

	const formatCredentialName = (key: string) => {
		return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
	};

	const hasValidCredentials = (credentials: string[]) => {
		return credentials.some(key => secrets[key]?.trim());
	};

	useEffect(() => {
		fetchSecrets();
	}, [fetchSecrets]);

	if (loading) {
		return <PageLoader text={"Loading Credentials..."}/>
	}

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<PageHeading title={"Credentials"} description={"API Credentials Manager"}/>
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					{/* Warning Banner */}
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
						<AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-yellow-800 mb-1">⚠️ Security Warning</h3>
							<p className="text-yellow-700 text-sm">
								You are managing sensitive API credentials that provide access to external services.
								These credentials should be handled with extreme care.
								Only authorized personnel should modify these values. Incorrect or compromised
								credentials may result in service disruptions or security breaches.
							</p>
						</div>
					</div>
				</div>

				{/* Credentials Groups Grid */}
				<div className="grid gap-6 lg:grid-cols-2">
					{CREDENTIAL_GROUPS.map((group) => {
						const IconComponent = group.icon;
						const isSaving = saving[group.id] || false;

						return (
							<div key={group.id} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col h-full">
								{/* Group Header */}
								<div className="flex items-center gap-3 mb-4">
									<div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
										<IconComponent className="w-6 h-6 text-gray-600" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
										<p className="text-gray-600 text-sm">{group.description}</p>
									</div>
								</div>

								{/* Credentials Inputs - Flex grow to push save button to bottom */}
								<div className="space-y-4 mb-6 flex-grow">
									{group.credentials.map((key) => {
										const value = secrets[key] || '';
										const isVisible = visibleSecrets[key] || false;

										return (
											<div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
												<div className="flex items-center gap-2 mb-2">
													<Key className="w-4 h-4 text-gray-500" />
													<label className="font-medium text-gray-700 text-sm">
														{formatCredentialName(key)}
													</label>
												</div>

												<div className="relative">
													<input
														type={isVisible ? 'text' : 'password'}
														value={value}
														onChange={(e) => handleInputChange(key, e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 pr-10 text-sm font-mono"
														placeholder="Enter credential value..."
													/>
													<button
														onClick={() => toggleVisibility(key)}
														className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
													>
														{isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
													</button>
												</div>
											</div>
										);
									})}
								</div>

								{/* Save Button - Aligned to bottom */}
								<button
									onClick={() => saveGroupSecrets(group.id, group.credentials)}
									disabled={isSaving || !hasValidCredentials(group.credentials)}
									className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-400 hover:bg-yellow-600 text-white rounded-lg focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium mt-auto"
								>
									{isSaving ? (
										<RefreshCw className="w-5 h-5 animate-spin" />
									) : (
										<Save className="w-5 h-5" />
									)}
									{isSaving ? 'Saving...' : `Save ${group.name} Credentials`}
								</button>
							</div>
						);
					})}
				</div>

				{/* Refresh Button */}
				<div className="mt-8 flex justify-center">
					<button
						onClick={fetchSecrets}
						disabled={loading}
						className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					>
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
						Refresh Credentials
					</button>
				</div>
			</div>

			{/* Toast */}
			{toast.show && (
				<Toast
					message={toast.message}
					type={toast.type}
					show={toast.show}
					onClose={hideToast}
				/>
			)}
		</div>
	);
}