// {
//     "frontend_payload": {
//     "campaign_id": "string (optional)",
//         "to": [
//         "string"
//     ],
//         "variables": [
//         {
//             "name": "string -> from template",
//             "value": "string -> static or dynamic"
//         }
//     ]
// },
//     "dynamic_values": [
//     "$dynamic_campaign_prizes",
//     "$dynamic_campaign_name",
//     "$dynamic_campaign_start_date",
//     "$dynamic_campaign_end_date",
//     "$dynamic_referral_code",
//     "$dynamic_customer_name",
//     "$dynamic_customer_email",
//     "$dynamic_codes"
// ],
//     "route": "/template/{template_id}/send_bulk"
// }

import { NextResponse } from 'next/server';

const SERVER_BASE_URL = process.env.SERVER_BASE_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

export async function GET() {
    try {
        const response = await fetch(`${SERVER_BASE_URL}/template/structure/example`, {
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