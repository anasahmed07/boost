import type { Metadata } from "next";
import "./globals.css";
import React from "react";

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: "http://localhost:3000";

export const metadata: Metadata = {
	metadataBase: new URL(defaultUrl),
	title: "Boost Agent Dashboard",
	description: "",
};



export default function RootLayout({
   children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
		<body className={`font-primary antialiased h-screen w-screen overflow-x-hidden flex selection:bg-yellow-400 selection:text-black`}>
			{children}
		</body>
		</html>
	);
}
