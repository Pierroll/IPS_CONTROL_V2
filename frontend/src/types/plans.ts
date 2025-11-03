// frontend/src/types/plan.ts
export interface Plan {
  id: string
  code: string
  name: string
  description?: string | null
  category: "INTERNET" | "TELEVISION" | "TELEPHONE" | "BUNDLE"
  subcategory?: "ANTENA" | "FIBRA_OPTICA" | null
  downloadSpeed?: number | null
  uploadSpeed?: number | null
  dataLimit?: number | null
  monthlyPrice: number
  setupFee?: number | null
  active: boolean
  isPromotional: boolean
  slaLevel: "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE"
  supportHours?: string | null
  features?: string[]
  restrictions?: string[]
  targetAudience?: string[]
  createdBy: string
  createdAt: string
  updatedAt?: string | null
  deletedAt?: string | null
  mikrotikProfileName?: string | null
}

export interface CreatePlanPayload {
  name: string
  description?: string | null
  category: "INTERNET" | "TELEVISION" | "TELEPHONE" | "BUNDLE"
  subcategory?: "ANTENA" | "FIBRA_OPTICA" | null
  downloadSpeed?: number | null
  uploadSpeed?: number | null
  dataLimit?: number | null
  monthlyPrice: number
  setupFee?: number | null
  active?: boolean
  isPromotional?: boolean
  slaLevel?: "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE"
  supportHours?: string | null
  features?: string[]
  restrictions?: string[]
  targetAudience?: string[]
  mikrotikProfileName?: string | null
}
