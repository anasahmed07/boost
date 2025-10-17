import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/supabase/ui/card";

export default function Page() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl">
								Successfully created account
							</CardTitle>
							<CardDescription>Check email to confirm account creation</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-neutral-500">
								You&apos;ve successfully created an account. Please have the link
								sent to the inbox to be opened to confirm account before signing in.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
