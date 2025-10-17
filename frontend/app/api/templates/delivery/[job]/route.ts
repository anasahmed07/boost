import { NextRequest, NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ job: string }> }
) {
    try {
        const { job } = await params;
        const response = await fetch(`${SERVER_BASE_URL}/template/delivery/${job}/status`, {
            headers: {
                'x-api-key': `${SERVER_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch template details');
        }

        const templateDetails = await response.json();
        return NextResponse.json(templateDetails);
    } catch (error) {
        console.error('Error fetching template details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch template details' },
            { status: 500 }
        );
    }
}