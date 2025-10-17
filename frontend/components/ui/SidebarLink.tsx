import {PageItem} from "@/types/nav";
import Link from "next/link";

const SidebarLink = ({ page, isSelected, isOpen }: { page: PageItem, isSelected: boolean, isOpen: boolean }) => {
	return (
		<Link
			className={`flex gap-4 items-center p-3 rounded-xl text-sm leading-none ${isOpen ? "w-60": "w-min"} duration-200 ${isSelected ? "bg-yellow-400 shadow shadow-yellow-300 text-inverse-text" : "text-neutral-500 hover:bg-yellow-100 hover:text-black "} ${isOpen && "hover:translate-x-1"}`}
			href={page.href}
		>
			<page.icon size={16}/>
			{isOpen && <div className="flex leading-none items-center font-semibold">{page.title}</div>}
		</Link>
	)
}

export default SidebarLink