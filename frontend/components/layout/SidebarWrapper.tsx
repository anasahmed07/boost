// components/layout/SidebarWrapper.tsx
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";

export default async function SidebarWrapper() {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();

		if (!user) {
			// Return a basic sidebar for unauthenticated users or redirect
			return <Sidebar />;
		}

		// Check if user is super admin
		const isSuperAdmin = user?.user_metadata?.role === 'super_admin' ||
			user?.app_metadata?.is_super_admin === true;

		// Get user role from metadata
		const userRole = user?.user_metadata?.role || user?.app_metadata?.role || 'user';

		return (
			<Sidebar
				userRole={userRole}
				isSuperAdmin={isSuperAdmin}
			/>
		);
	} catch (error) {
		console.error('Error fetching user data for sidebar:', error);
		// Return basic sidebar on error
		return <Sidebar />;
	}
}