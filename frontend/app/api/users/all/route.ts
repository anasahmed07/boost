import {UserData} from "@/types/user";

interface CustomUserData extends UserData {
	status: "active" | "chat_only" | "customer_only"
}
async function getOrderedCustomersWithStatus() {
	try {
		// Fetch both datasets in parallel
		const [customersRes, chatNumbersRes] = await Promise.all([
			fetch(`${process.env.SERVER_BASE_URL || ""}/customers/?limit=100`, {
				method: 'GET',
				headers: {
					'accept': 'application/json',
					'x-api-key': process.env.SERVER_API_KEY || "",
				},
				cache: 'no-store'
			}),
			fetch(`${process.env.SERVER_BASE_URL || ""}/chats/phone-numbers`, {
				method: 'GET',
				headers: {
					'accept': 'application/json',
					'x-api-key': process.env.SERVER_API_KEY || "",
				},
				cache: 'no-store'
			})
		]);

		if (!customersRes.ok || !chatNumbersRes.ok) {
			throw new Error('Failed to fetch data');
		}

		const customersData = await customersRes.json();
		const chatData = await chatNumbersRes.json();

		// Create a map of phone numbers to customer data for quick lookup
		const customerMap = new Map();
		customersData.customers.forEach((customer: UserData) => {
			customerMap.set(customer.phone_number, customer);
		});
		// Create ordered list based on chat phone numbers
		const orderedCustomers = chatData.phone_numbers.map((phoneNumber: string) => {
			const customer = customerMap.get(phoneNumber);

			// if (customer) {
			// 	// Customer exists in both - active
				return {
					...customer,
					status: 'active',
					hasChat: true,
					hasCustomerData: true
				};
			// } else {
				// Phone number exists in chats but not in customers - disabled
				// return {
				// 	phone_number: phoneNumber,
				// 	customer_name: null,
				// 	email: null,
				// 	customer_type: null,
				// 	company_name: null,
				// 	address: null,
				// 	total_spend: 0,
				// 	is_active: false,
				// 	escalation_status: false,
				// 	cart_id: null,
				// 	customer_quickbook_id: null,
				// 	interest_groups: null,
				// 	order_history: null,
				// 	socials: null,
				// 	tags: [],
				// 	status: 'chat_only',
				// 	hasChat: true,
				// 	hasCustomerData: false
				// };
			// }
		});

		// Find customers that exist but don't have chats (append to end)
		const chatPhoneNumbers = new Set(chatData.phone_numbers);
		const customersWithoutChats = customersData.customers
			.filter((customer: UserData) => !chatPhoneNumbers.has(customer.phone_number))
			.map((customer: UserData) => ({
				...customer,
				status: 'customer_only',
				hasChat: false,
				hasCustomerData: true
			}));

		// Combine ordered customers with customers that don't have chats
		const finalOrderedCustomers = [...orderedCustomers, ...customersWithoutChats];

		return {
			customers: finalOrderedCustomers,
			total: finalOrderedCustomers.length,
			stats: {
				active: orderedCustomers.filter((c: CustomUserData) => c.status === 'active').length,
				chatOnly: orderedCustomers.filter((c: CustomUserData) => c.status === 'chat_only').length,
				customerOnly: customersWithoutChats.length
			}
		};

	} catch (error) {
		console.error('Error processing customers:', error);
		throw error;
	}
}

// For your existing API route, modify it like this:
export async function GET() {
	try {
		const result = await getOrderedCustomersWithStatus();
        console.log(result.customers.slice(0, 10))
		return Response.json(result);
	} catch (err) {
		console.error('Error fetching ordered customers:', err);
		return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
	}
}