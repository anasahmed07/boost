export function formatPakPhone(phone: string | number): string {
	const digits = String(phone).replace(/\D/g, ""); // remove non-digits
	if (digits.length !== 12 || !digits.startsWith("92")) {
		console.log("Invalid Pakistan phone number");
	}
	return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

export function formatDateTime(isoString: string): string {
	const date = new Date(isoString);

	const time = date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true
	});

	const day = date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	});

	return `${time}, ${day}`;
}