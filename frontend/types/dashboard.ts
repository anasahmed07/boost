import React from "react";

export type StatMetric = {
	name: string;
	number?: number;
	percentage: string;
	isDecline: boolean;
	iconColor: string;
	icon: React.ElementType;
}
