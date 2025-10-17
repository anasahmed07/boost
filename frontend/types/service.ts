
export enum ServiceStatuses {
	Operational = "Operational",
	Degraded = "Degraded",
	Down = "Down"
}

export type ServiceStatus = {
	name: string;
	uptime: number;
	status: ServiceStatuses;
};