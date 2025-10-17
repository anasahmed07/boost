import React from "react";
import SidebarWrapper from "@/components/layout/SidebarWrapper";


export default function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex w-full h-full">
			<SidebarWrapper />
			<main className="flex-1 overflow-y-auto">
				{children}
			</main>
		</div>
	);
}

// GODDAMNIT

// LORD HAVE MERCY ON MY WRETCHED SOUL