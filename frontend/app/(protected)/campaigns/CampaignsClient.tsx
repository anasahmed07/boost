'use client'

import {useState, useEffect} from 'react';

import Toast from '@/components/ui/Toast';

import AnalyticsModal from "@/components/campaigns/AnalyticsModal";
import CampaignsHeader from "@/components/campaigns/Header";
import SearchBar from "@/components/campaigns/SearchBar";
import StatsGrid from "@/components/campaigns/StatsGrid";
import LoadingSkeleton from "@/components/campaigns/LoadingSkeleton";
import CampaignCard from "@/components/campaigns/CampaignCard";
import EmptyState from "@/components/campaigns/EmptyState";
import CreateCampaignForm from "@/components/campaigns/CreateCampaignForm";
import DeleteConfirmationModal from "@/components/campaigns/DeleteConfirmationModal";

import type {Campaign, CreateCampaignFormData, CampaignsPageProps} from "@/types/campaigns"


export default function CampaignsPage({user}: CampaignsPageProps) {
	const [campaigns, setCampaigns] = useState<Campaign[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [showCreateForm, setShowCreateForm] = useState(false)
	const [showAnalytics, setShowAnalytics] = useState(false)
	const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
	const [currentPrize, setCurrentPrize] = useState('')
	const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
	const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
	const [toast, setToast] = useState<{
		show: boolean
		message: string
		type: 'success' | 'error'
	}>({
		show: false,
		message: '',
		type: 'success'
	})

	const [formData, setFormData] = useState<CreateCampaignFormData>({
		name: '',
		start_date: new Date().toISOString().split('T')[0],
		end_date: '',
		description: '',
		prizes: [],
		targets: []
	})

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = () => {
			setOpenDropdownId(null)
		}

		if (openDropdownId) {
			document.addEventListener('click', handleClickOutside)
		}

		return () => {
			document.removeEventListener('click', handleClickOutside)
		}
	}, [openDropdownId])

	// Placeholder analytics data generator


	const showToast = (message: string, type: 'success' | 'error') => {
		setToast({show: true, message, type})
	}

	const hideToast = () => {
		setToast(prev => ({...prev, show: false}))
	}

	const handleViewAnalytics = (campaignId: string) => {
		setSelectedCampaignId(campaignId)
		setShowAnalytics(true)
		setOpenDropdownId(null)
	}

	const handleDeleteCampaign = async () => {
		if (!campaignToDelete) return

		try {
			const response = await fetch(`/api/campaigns/${campaignToDelete}/delete`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const result = await response.json()
				throw new Error(result.error || 'Failed to delete campaign')
			}

			setCampaigns(campaigns.filter((c) => c.id !== campaignToDelete))
			showToast('Campaign deleted successfully! 🗑️', 'success')
		} catch (error) {
			console.error('Error deleting campaign:', error)
			showToast(
				error instanceof Error ? error.message : 'Failed to delete campaign',
				'error'
			)
		} finally {
			setCampaignToDelete(null)
		}
	}

	const toggleDropdown = (campaignId: string, e: React.MouseEvent) => {
		e.stopPropagation()
		setOpenDropdownId(openDropdownId === campaignId ? null : campaignId)
	}

	// Fetch campaigns on component mount
	useEffect(() => {
		const fetchCampaigns = async () => {
			try {
				setLoading(true)
				const response = await fetch('/api/campaigns')
				const result = await response.json()

				if (!response.ok) {
					throw new Error(result.error || 'Failed to fetch campaigns')
				}

				setCampaigns(result.data || [])
			} catch (error) {
				console.error('Error fetching campaigns:', error)
				showToast(
					error instanceof Error ? error.message : 'Failed to load campaigns',
					'error'
				)
				setCampaigns([])
			} finally {
				setLoading(false)
			}
		}

		fetchCampaigns()
	}, [])

	const filteredCampaigns = campaigns.filter(campaign =>
		campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
	)

	const handleCreateCampaign = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!user?.email) {
			showToast('Please log in to create a campaign', 'error')
			return
		}

		if (new Date(formData.end_date) <= new Date(formData.start_date)) {
			showToast('End date must be after the start date', 'error')
			return
		}

		const campaignData = {
			name: formData.name,
			start_date: formData.start_date,
			end_date: formData.end_date,
			status: true,
			created_by: user.email,
			description: formData.description,
			prizes: formData.prizes,
			targets: formData.targets,
		}

		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(campaignData)
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create campaign')
			}

			const newCampaign: Campaign = {
				id: result.data?.id || Math.random().toString(36).substr(2, 4).toUpperCase(),
				name: campaignData.name,
				start_date: new Date(campaignData.start_date).toISOString(),
				end_date: new Date(campaignData.end_date).toISOString(),
				status: true,
				created_by: campaignData.created_by,
				description: campaignData.description,
				prizes: campaignData.prizes
			}

			setCampaigns([newCampaign, ...campaigns])
			setFormData({
				name: '',
				start_date: new Date().toISOString().split('T')[0],
				end_date: '',
				description: '',
				prizes: [],
				targets: []
			})
			setShowCreateForm(false)
			showToast('Campaign created successfully! 🎉', 'success')

		} catch (error) {
			console.error('Error creating campaign:', error)
			showToast(error instanceof Error ? error.message : 'Failed to create campaign', 'error')
		}
	}

	const addPrize = () => {
		if (currentPrize.trim()) {
			setFormData({
				...formData,
				prizes: [...formData.prizes, currentPrize.trim()]
			})
			setCurrentPrize('')
		}
	}

	const removePrize = (index: number) => {
		setFormData({
			...formData,
			prizes: formData.prizes.filter((_, i) => i !== index)
		})
	}

	// Render different views based on state
	if (showAnalytics) {
		const campaign = campaigns.find(c => c.id === selectedCampaignId)
		// const analytics = generatePlaceholderAnalytics(selectedCampaignId)

		if (!campaign) return null

		return (
			<AnalyticsModal
				campaign={campaign}
				// analytics={analytics}
				onClose={() => setShowAnalytics(false)}
			/>
		)
	}

	if (showCreateForm) {
		return (
			<CreateCampaignForm
				formData={formData}
				currentPrize={currentPrize}
				onFormDataChange={setFormData}
				onCurrentPrizeChange={setCurrentPrize}
				onSubmit={handleCreateCampaign}
				onCancel={() => setShowCreateForm(false)}
				onAddPrize={addPrize}
				onRemovePrize={removePrize}
			/>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<CampaignsHeader onCreateClick={() => setShowCreateForm(true)} />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
				<StatsGrid campaigns={campaigns} />

				{/* Campaigns Grid */}
				{loading ? (
					<LoadingSkeleton />
				) : filteredCampaigns.length === 0 ? (
					<EmptyState
						searchTerm={searchTerm}
						onCreateClick={() => setShowCreateForm(true)}
					/>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{filteredCampaigns.map((campaign) => (
							<CampaignCard
								key={campaign.id}
								campaign={campaign}
								openDropdownId={openDropdownId}
								onToggleDropdown={toggleDropdown}
								onViewAnalytics={handleViewAnalytics}
								onDelete={(id) => {
									setOpenDropdownId(null)
									setCampaignToDelete(id)
								}}
							/>
						))}
					</div>
				)}
			</div>

			{/* Toast Notification */}
			{toast.show && (
				<Toast
					message={toast.message}
					type={toast.type}
					show={toast.show}
					onClose={hideToast}
				/>
			)}

			<DeleteConfirmationModal
				campaignToDelete={campaignToDelete}
				campaigns={campaigns}
				onClose={() => setCampaignToDelete(null)}
				onConfirm={handleDeleteCampaign}
			/>
		</div>
	)
}