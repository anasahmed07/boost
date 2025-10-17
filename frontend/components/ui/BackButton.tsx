"use client";

import { useRouter } from "next/navigation";
import {ChevronLeft} from "lucide-react";

export default function BackButton() {
	const router = useRouter();

	return (
		<button
			onClick={() => router.back()}
			className="p-2 hover:shadow-sm rounded-full duration-200 items-center justify-center cursor-pointer flex text-black border border-neutral-400  duration-150"
		>
			<ChevronLeft size={14}/>
		</button>
	);
}
