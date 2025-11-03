// frontend/src/lib/labels.ts

export type AssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type PlanChangeType =
  | 'UPGRADE'
  | 'DOWNGRADE'
  | 'LATERAL'
  | 'SUSPENSION'
  | 'REACTIVATION'
  | 'NEW';

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
  CANCELLED: 'Cancelado',
};

export const CHANGE_TYPE_LABEL: Record<PlanChangeType, string> = {
  UPGRADE: 'Mejora',
  DOWNGRADE: 'Degradación',
  LATERAL: 'Lateral',
  SUSPENSION: 'Suspensión',
  REACTIVATION: 'Reactivación',
  NEW: 'Nuevo',
};
