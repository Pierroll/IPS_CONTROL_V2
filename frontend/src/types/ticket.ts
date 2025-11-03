export enum TicketCategory {
  INSTALACION = "INSTALACION",
  SOPORTE_TECNICO = "SOPORTE_TECNICO",
  MANTENIMIENTO = "MANTENIMIENTO",
  RECLAMO = "RECLAMO",
  CONSULTA = "CONSULTA",
  SUSPENSION = "SUSPENSION",
  REACTIVACION = "REACTIVACION",
  CAMBIO_PLAN = "CAMBIO_PLAN",
}

export enum Priority {
  BAJA = "BAJA",
  MEDIA = "MEDIA",
  ALTA = "ALTA",
  CRITICA = "CRITICA",
}

export enum SLALevel {
  BASIC = "BASIC",
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
  ENTERPRISE = "ENTERPRISE",
}

export enum TicketStatus {
  PENDIENTE = "PENDIENTE",
  ASIGNADO = "ASIGNADO",
  EN_PROGRESO = "EN_PROGRESO",
  ESCALADO = "ESCALADO",
  EN_ESPERA = "EN_ESPERA",
  RESUELTO = "RESUELTO",
  CERRADO = "CERRADO",
  CANCELADO = "CANCELADO",
}

// Funciones de mapeo para mostrar etiquetas amigables
export const getTicketCategoryLabel = (category: TicketCategory): string => {
  const labels: Record<TicketCategory, string> = {
    [TicketCategory.INSTALACION]: "Instalación",
    [TicketCategory.SOPORTE_TECNICO]: "Soporte Técnico",
    [TicketCategory.MANTENIMIENTO]: "Mantenimiento",
    [TicketCategory.RECLAMO]: "Reclamo",
    [TicketCategory.CONSULTA]: "Consulta",
    [TicketCategory.SUSPENSION]: "Suspensión",
    [TicketCategory.REACTIVACION]: "Reactivación",
    [TicketCategory.CAMBIO_PLAN]: "Cambio de Plan",
  };
  return labels[category] || category;
};

export const getPriorityLabel = (priority: Priority): string => {
  const labels: Record<Priority, string> = {
    [Priority.BAJA]: "Baja",
    [Priority.MEDIA]: "Media",
    [Priority.ALTA]: "Alta",
    [Priority.CRITICA]: "Crítica",
  };
  return labels[priority] || priority;
};

export const getSLALevelLabel = (slaLevel: SLALevel): string => {
  const labels: Record<SLALevel, string> = {
    [SLALevel.BASIC]: "Básico",
    [SLALevel.STANDARD]: "Estándar",
    [SLALevel.PREMIUM]: "Premium",
    [SLALevel.ENTERPRISE]: "Empresarial",
  };
  return labels[slaLevel] || slaLevel;
};

export const getTicketStatusLabel = (status: TicketStatus): string => {
  const labels: Record<TicketStatus, string> = {
    [TicketStatus.PENDIENTE]: "Pendiente",
    [TicketStatus.ASIGNADO]: "Asignado",
    [TicketStatus.EN_PROGRESO]: "En Progreso",
    [TicketStatus.ESCALADO]: "Escalado",
    [TicketStatus.EN_ESPERA]: "En Espera",
    [TicketStatus.RESUELTO]: "Resuelto",
    [TicketStatus.CERRADO]: "Cerrado",
    [TicketStatus.CANCELADO]: "Cancelado",
  };
  return labels[status] || status;
};

export interface CreateTicketPayload {
  customerId: string
  assignedTechnician?: string | null
  title: string
  description: string
  category: TicketCategory
  priority: Priority
  serviceAddress?: string | null
  serviceDistrict: string
  gpsCoordinates?: string | null
  notes?: string | null
  slaLevel: SLALevel
  dueDate?: string | null
  estimatedCost?: number | null
  estimatedHours?: number | null
  // Campos adicionales que el backend espera
  subcategory?: string | null
  internalNotes?: string | null
  clientNotes?: string | null
  tags?: string[]
}

export interface Ticket {
  id: string
  ticketNumber: string
  customerId: string
  customer: { name: string; phone?: string }
  assignedTechnician?: string
  assignedTechnicianInfo?: { name: string; phone?: string }
  title: string
  description: string
  category: TicketCategory
  priority: Priority
  status: TicketStatus
  serviceAddress: string
  serviceDistrict: string
  gpsCoordinates?: string
  notes?: string
  slaLevel?: SLALevel
  dueDate?: Date
  estimatedCost?: number
  actualCost?: number
  estimatedHours?: number
  actualHours?: number
  createdAt: Date
  updatedAt: Date
  attachments?: any[]
  history?: any[]
  workLogs?: any[]
  rating?: { rating: number; comment?: string } | null
}