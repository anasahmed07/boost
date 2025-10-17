import { NextRequest, NextResponse } from 'next/server'

interface CampaignData {
	name: string
	start_date: string
	end_date: string
	status: boolean
	created_by: string
	description: string
	prizes: string[]
}

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const body: CampaignData = await request.json()

		// Validate required fields
		if (!body.name || !body.start_date || !body.end_date || !body.created_by || !body.description) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			)
		}

		// Validate date format and logic
		const startDate = new Date(body.start_date)
		const endDate = new Date(body.end_date)

		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return NextResponse.json(
				{ error: 'Invalid date format' },
				{ status: 400 }
			)
		}

		if (endDate <= startDate) {
			return NextResponse.json(
				{ error: 'End date must be after start date' },
				{ status: 400 }
			)
		}

		// Prepare the data for external API
		const campaignData = {
			name: body.name,
			start_date: body.start_date,
			end_date: body.end_date,
			status: body.status ?? true,
			created_by: body.created_by,
			description: body.description,
			prizes: body.prizes || []
		}

		// Get the server base URL from environment variables
		const serverBaseUrl = process.env.SERVER_BASE_URL

		if (!serverBaseUrl) {
			console.error('SERVER_BASE_URL environment variable is not set')
			return NextResponse.json(
				{ error: 'Server configuration error' },
				{ status: 500 }
			)
		}

		// Submit to external API
		const response = await fetch(`${serverBaseUrl}/campaigns`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': process.env.API_KEY ?? 'abcd',
			},
			body: JSON.stringify(campaignData)
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('External API error:', response.status, errorText)

			return NextResponse.json(
				{
					error: 'Failed to create campaign',
					details: response.status === 400 ? 'Invalid data provided' : 'Server error'
				},
				{ status: response.status === 400 ? 400 : 500 }
			)
		}

		const responseData = await response.json()

		// Return success response
		return NextResponse.json(
			{
				success: true,
				message: 'Campaign created successfully',
				data: responseData
			},
			{ status: 201 }
		)

	} catch (error) {
		console.error('Error creating campaign:', error)

		// Handle JSON parsing errors
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ error: 'Invalid JSON format' },
				{ status: 400 }
			)
		}

		// Handle fetch errors
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return NextResponse.json(
				{ error: 'Failed to connect to server' },
				{ status: 503 }
			)
		}

		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}

// Optional: Add GET method to fetch campaigns
export async function GET() {
	try {
		const serverBaseUrl = process.env.SERVER_BASE_URL

		if (!serverBaseUrl) {
			return NextResponse.json(
				{ error: 'Server configuration error' },
				{ status: 500 }
			)
		}

		const response = await fetch(`${serverBaseUrl}/campaigns`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': process.env.API_KEY ?? 'abcd',
				// Add any additional headers like authorization if needed
			},
			// Add cache control if needed
			next: { revalidate: 60 } // Revalidate every 60 seconds
		})

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Failed to fetch campaigns' },
				{ status: response.status }
			)
		}

		const campaigns = await response.json()

		return NextResponse.json({
			success: true,
			data: campaigns
		})

	} catch (error) {
		console.error('Error fetching campaigns:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}

// DELETE method to delete a campaign
// DELETE method to delete a campaign
export async function DELETE(request: NextRequest) {
	try {
		const url = new URL(request.url)
		const campaignId = url.searchParams.get('id')

		if (!campaignId) {
			return NextResponse.json(
				{ error: 'Campaign ID is required' },
				{ status: 400 }
			)
		}

		const serverBaseUrl = process.env.SERVER_BASE_URL

		if (!serverBaseUrl) {
			return NextResponse.json(
				{ error: 'Server configuration error' },
				{ status: 500 }
			)
		}

		// Delete from external API
		const response = await fetch(`${serverBaseUrl}/campaigns/${campaignId.toUpperCase()}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': process.env.API_KEY ?? 'abcd',
			}
		})

		console.log(response.json())

		if (!response.ok) {
			const errorText = await response.text()
			console.error('External API error:', response.status, errorText)

			if (response.status === 404) {
				return NextResponse.json(
					{ error: 'Campaign not found' },
					{ status: 404 }
				)
			}

			return NextResponse.json(
				{ error: 'Failed to delete campaign' },
				{ status: response.status }
			)
		}

		return NextResponse.json({
			success: true,
			message: 'Campaign deleted successfully'
		})

	} catch (error) {
		console.error('Error deleting campaign:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}