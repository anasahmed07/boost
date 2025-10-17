"use client";
// import Image from 'next/image'

import Image from "next/image";
import Favicon from "/public/icon.png";

import React, {useState} from "react";
import {
	Archive,
	ChartColumn, ChevronLeft, ChevronRight, HelpCircle, Hourglass, KeyRound,
	LayoutDashboard, Megaphone, MessageSquare, MessageSquarePlus, Settings, Users
} from "lucide-react";
import {PageGroup, PageItem} from "@/types/nav";
import SidebarLink from "@/components/ui/SidebarLink";
import {usePathname} from "next/navigation";
import {LogoutButton} from "@/components/supabase/logout-button";

interface SidebarProps {
	userRole?: string;
	isSuperAdmin?: boolean;
}

export default function Sidebar({ userRole, isSuperAdmin }: SidebarProps) {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(true);

	// Determine user permissions
	const isAdmin = userRole === 'admin' || isSuperAdmin;
	const isSuperAdminUser = isSuperAdmin || userRole === 'super_admin';

	// Helper function to filter items based on role
	const filterItemsByRole = (items: PageItem[]): PageItem[] => {
		return items.filter(item => {
			// Super admin only items
			if (['credentials', 'settings'].some(path => item.href.includes(path))) {
				return isSuperAdminUser;
			}

			// Admin+ items (admin and super admin)
			if (['broadcast', 'users', 'add-user', 'campaigns', 'customers'].some(path => item.href.includes(path))) {
				return isAdmin;
			}

			// All authenticated users can access these
			return true;
		});
	};

	const pages: PageGroup[] = [
		{
			title: "Core Operations",
			items: [
				{
					title: "Dashboard",
					href: "/dashboard",
					icon: LayoutDashboard
				},
				{
					title: "Inbox",
					href: "/inbox",
					icon: MessageSquare
				},
				{
					title: "Broadcast",
					href: "/broadcast",
					icon: MessageSquarePlus
				},
				{
					title: "Product Waitlist",
					href: "/waitlist",
					icon: Hourglass // or Clock depending on tone
				}
			]
		},
		{
			title: "Customer Management",
			items: [
				{
					title: "Customers",
					href: "/customers",
					icon: Users
				},
				{
					title: "Campaigns",
					href: "/campaigns",
					icon: Megaphone
				}
			]
		},
		{
			title: "Analytics & Insights",
			items: [
				{
					title: "Analytics",
					href: "/analytics",
					icon: ChartColumn
				}
			]
		},
		{
			title: "Knowledge base",
			items: [
				{
					title: "Company Knowledge Base",
					href: "/knowledge-base",
					icon: Archive
				},
				{
					title: "FAQs",
					href: "/faqs",
					icon: HelpCircle
				}
			]
		},
		{
			title: "System Management",
			items: [
				{
					title: "Team Management",
					href: "/team",
					icon: Users
				},
				{
					title: "Credentials",
					href: "/credentials",
					icon: KeyRound
				},
				{
					title: "Settings",
					href: "/settings",
					icon: Settings
				}
			]
		}
	];

	// Filter pages based on user role
	const filteredPages: PageGroup[] = pages.map(pageGroup => ({
		...pageGroup,
		items: filterItemsByRole(pageGroup.items)
	})).filter(pageGroup => pageGroup.items.length > 0); // Remove empty groups

	const switchOpen = () => {
		setIsOpen(!isOpen);
	}

	return (
		<div className="flex flex-col shadow-xl justify-between min-h-screen max-h-screen overflow-y-auto">
			<div className="flex flex-col">
				<div className={`flex gap-4 ${isOpen && "p-6"} items-center border-b border-secondary`}>
					{isOpen && <><div className="flex rounded-md bg-yellow-400 p-0.5 shadow-sm shadow-yellow-500 text-2xl font-bold">
                       	{/*AI*/}
                        <Image src={Favicon} alt="App Icon" width={40} height={40} />
						{/*<Image alt={"logo"} src={"https://boost-lifestyle.co/cdn/shop/files/CompressJpeg.Online_Crop-Img_18_1107x.webp?v=1713279590"} width={"20"} height={"50"}/>*/}
                    </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex text-2xl font-semibold">Boost Buddy</div>
                            <div className="flex text-neutral-500 text-sm">
                                Dashboard
								{isSuperAdminUser && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Super Admin</span>}
								{isAdmin && !isSuperAdminUser && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Admin</span>}
                            </div>
                        </div></>}
					<button
						onClick={switchOpen}
						className={` ${isOpen ? "ml-auto mr-0" : "mx-auto my-6"} hover:bg-yellow-300 rounded-md p-2 duration-150 cursor-pointer`}>
						{isOpen ? <ChevronLeft/> : <ChevronRight/>}
					</button>
				</div>

				<div className={`flex flex-col ${isOpen ? "p-6 gap-4" : "p-1"}  h-full`}>
					{
						filteredPages.map((pageGroup: PageGroup, i: number) => (
							<div className={`flex flex-col  ${isOpen ? "mb-2 gap-2" : ""}`} key={i}>
								{isOpen && <div
									className={"text-neutral-400 font-semibold text-xs uppercase "}>{pageGroup.title}</div>}
								<div className={`flex flex-col ${isOpen ? "gap-2" : "gap-1"}`}>
									{
										pageGroup.items.map((page: PageItem, ii: number) => (
											<SidebarLink page={page} key={ii} isSelected={pathname === page.href} isOpen={isOpen}/>
										))
									}
								</div>
							</div>
						))
					}
				</div>
			</div>
			{isOpen && <div className="flex flex-col border-t border-neutral-200 p-4 gap-2">
                <LogoutButton/>
            </div>}
		</div>
	)
}