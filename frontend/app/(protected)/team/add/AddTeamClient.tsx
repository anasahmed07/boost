"use client";

import { useState } from "react";
import { Button } from "@/components/supabase/ui/button";
import {
	Card,
	// Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/supabase/ui/card";
import { Input } from "@/components/supabase/ui/input";
import { Label } from "@/components/supabase/ui/label";
// import { cn } from "@/lib/utils";
import {createClient} from "@/lib/supabase/client";
import BackButton from "@/components/ui/BackButton";

// interface AddUserFormProps extends React.ComponentPropsWithoutRef<"div"> {}

// { className, ...props }: React.ComponentPropsWithoutRef<"div">
export default function AddUserForm() {
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		firstName: "",
		lastName: "",
		role: "user" // or whatever roles you have
	});
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const supabase = createClient();
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		setFormData(prev => ({
			...prev,
			[e.target.name]: e.target.value
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {

			const { data: { session } } = await supabase.auth.getSession();

			const response = await fetch('/api/admin/create-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session?.access_token}`,
				},
				body: JSON.stringify({
					email: formData.email,
					password: formData.password,
					userData: {
						first_name: formData.firstName,
						last_name: formData.lastName,
						role: formData.role
					}
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create user');
			}

			setSuccess(`User ${formData.email} created successfully!`);
			setFormData({
				email: "",
				password: "",
				firstName: "",
				lastName: "",
				role: "user"
			});

		} catch (error) {
			setError(error instanceof Error ? error.message : 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	// <div className={cn("flex flex-col gap-6", className)} {...props}>

	return (
		<div className={""}>

			<Card>
				<CardHeader>
					<div className="flex gap-4 items-center">
						<div className="flex h-min">
							<BackButton/>
						</div>
						<div className="flex flex-col">
							<CardTitle className="text-2xl">Add New User</CardTitle>
							<CardDescription>
								Create a new user account for your platform
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="firstName">First Name</Label>
									<Input
										id="firstName"
										name="firstName"
										type="text"
										required
										value={formData.firstName}
										onChange={handleInputChange}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="lastName">Last Name</Label>
									<Input
										id="lastName"
										name="lastName"
										type="text"
										required
										value={formData.lastName}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="user@example.com"
									required
									value={formData.email}
									onChange={handleInputChange}
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="password">Temporary Password</Label>
								<Input
									id="password"
									name="password"
									type="password"
									placeholder="Temporary password"
									required
									minLength={6}
									value={formData.password}
									onChange={handleInputChange}
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="role">Role</Label>
								<select
									id="role"
									name="role"
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
									value={formData.role}
									onChange={handleInputChange}
								>
									<option value="representative">Representative</option>
									{/*<option value="manager">Manager (non-functional)</option>*/}
									<option value="admin">Admin</option>
								</select>
							</div>

							{error && (
								<div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
									{error}
								</div>
							)}

							{success && (
								<div className="p-3 text-sm text-green-500 bg-green-50 rounded-md">
									{success}
								</div>
							)}

							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Creating User..." : "Create User"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}