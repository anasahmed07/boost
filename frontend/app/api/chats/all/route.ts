import {NextResponse} from 'next/server';


async function getAllCustomersWithStatus() {
    try {
        const chats = await fetch(`${process.env.SERVER_BASE_URL || ""}/chats/list-chats?limit=1000`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'x-api-key': process.env.SERVER_API_KEY || "",
            },
            cache: 'no-store'
        });

        if (!chats.ok) {
            console.log(chats);
            throw new Error('Failed to fetch data');
        }

        return await chats.json();
    } catch (error) {
        console.error('Error processing customers:', error);
        throw error;
    }
}

export async function GET() {
    try {
        const result = await getAllCustomersWithStatus();
        return NextResponse.json(result);
    } catch (err) {
        console.error('Error fetching customers:', err);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}