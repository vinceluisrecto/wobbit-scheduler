export type ServiceState = 'up' | 'down';

export interface HealthStatus {
  status: ServiceState;
  database: ServiceState;
}
