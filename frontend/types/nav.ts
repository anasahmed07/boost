import React from "react";

export type PageItem = {
	title: string;
	href: string;
	icon: React.ElementType;
};

export type PageGroup = {
	title: string;
	items: PageItem[];
};