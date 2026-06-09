export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/** Human-friendly labels for roles, used in the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.USER]: 'User',
  [Role.ADMIN]: 'Admin',
};

export enum RequestStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  CANCELLED = 'CANCELLED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/** Statuses where a request is still considered "active" / open work. */
export const ACTIVE_STATUSES: RequestStatus[] = [
  RequestStatus.OPEN,
  RequestStatus.IN_PROGRESS,
  RequestStatus.REOPENED,
];

/** Statuses where a request is done (no further work expected). */
export const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.CLOSED,
  RequestStatus.CANCELLED,
];
