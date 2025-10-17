import React from "react";

export const PageHeading = ({title, description, bottomMargin="8"} : {title: string, description: string, bottomMargin?: string;}) => {
	return (
		<div className={`mb-${bottomMargin}`}>
			<h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
			<p className="text-gray-600">{description}</p>
		</div>
	)
}

export const DashboardWorkspaceNamedBlock = ({heading, description="", children, extraClasses=""}: {heading: string, description?: string, children: React.ReactNode, extraClasses?: string}) => {
	return (
		<div className={`flex flex-col shadow-xl rounded-md ${extraClasses} bg-card`}>

			<div className="flex flex-col p-6 border-b border-neutral-200 gap-4">
				<div className="text-2xl font-bold">{heading}</div>
				{description && <div className="text-neutral-500 font-semibold text-sm">{description}</div>}
			</div>
			<div className="flex flex-col gap-6 p-4">


				{children}

			</div>
		</div>
	)
}

export const DashboardWorkspaceTitledBlock = ({heading, children, extraClasses=""}: {heading: string, children: React.ReactNode, extraClasses?: string}) => {
	return (
		<div className={`flex flex-col shadow-xl rounded-md ${extraClasses} bg-card`}>

			<div className="flex flex-col p-6 gap-4">
				<div className="text-2xl font-bold">{heading}</div>
			</div>
			<div className="flex flex-col gap-6 p-4">
				{children}
			</div>
		</div>
	)
}

export const ScreenSizeGetter = () => {
	return (
		<div className="bg-white p-2 uppercase text-black font-bold duration-300 h-min fixed! top-1 right-1 z-600">
			<div className="hidden! sm:hidden! md:hidden! lg:hidden! xl:hidden! 2xl:flex!">2XL (1344)</div>
			<div className="hidden! sm:hidden! md:hidden! lg:hidden! xl:flex! 2xl:hidden!">XL (1120)</div>
			<div className="hidden! sm:hidden! md:hidden! lg:flex! xl:hidden! 2xl:hidden!">LG (896)</div>
			<div className="hidden! sm:hidden! md:flex! lg:hidden! xl:hidden! 2xl:hidden!">MD (672)</div>
			<div className="hidden! sm:flex! md:hidden! lg:hidden! xl:hidden! 2xl:hidden!">SM (560)</div>
			<div className="flex! sm:hidden! md:hidden! lg:hidden! xl:hidden! 2xl:hidden!">MO</div>
		</div>
	)
}