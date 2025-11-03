// src/types/technician.ts
export interface Technician {
  id: string
  code: string
  name: string
  phone: string
  email?: string
  district: string
  province?: string
  department?: string
  active: boolean
  rating: number
  totalJobs: number
  createdAt: Date
  userId?: string // Relación opcional con User
  // Otros campos opcionales como specialties, certifications, etc., si los necesitas en el frontend
}

export interface CreateTechnicianPayload {
  name: string
  phone: string
  email?: null | string
  documentNumber?: string | null
  userId?: string | null
  specialties?: Record<string, any>
  certifications?: Record<string, any>
  experience?: number
  hourlyRate?: number
  workSchedule?: Record<string, any>
  isExternal?: boolean
  active?: boolean
  district: string
  province?: string
  department?: string
  createdBy?: string
}