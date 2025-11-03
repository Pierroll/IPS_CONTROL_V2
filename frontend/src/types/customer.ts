export interface PppoeAccount {
  username: string;
  profile?: string;
  device?: {
    name: string;
    ipAddress: string;
  };
}

export interface Customer {
  id: string
  code: string
  name: string
  businessName?: string | null
  email?: string | null
  phone: string
  alternativePhone?: string | null
  address?: string | null
  district?: string | null
  province?: string | null
  department?: string | null
  documentNumber?: string | null
  documentType?: 'DNI' | 'RUC' | 'PASSPORT' | 'CE' | null
  customerType: 'INDIVIDUAL' | 'BUSINESS' | 'CORPORATION'
  serviceType?: string | null
  contractDate?: Date | null
  creditLimit?: number | null
  notes?: string | null
  tags?: string[]
  priority?: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  source?: string | null
  assignedSeller?: string | null
  technicianId?: string | null
  createdAt: Date
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PROSPECT' | 'CHURNED'
  customerPlans: {
    id: string
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CANCELLED'
    startDate: Date
    plan: {
      name: string
      monthlyPrice: number
    }
  }[]
  billingAccount?: {
    balance: number
    status: string
    lastPaymentDate?: Date
    suspendedAt?: Date
  }
  invoices?: {
    id: string
    invoiceNumber: string
    periodStart: Date
    periodEnd: Date
    dueDate: Date
    status: string
    total: number
    balanceDue: number
  }[]
  pppoeAccounts?: PppoeAccount[];
}

export interface CreateCustomerPayload {
  name: string
  phone: string
  email?: string | null
  address: string
  district: string
  province?: string | null
  department?: string | null
  documentNumber?: string | null
  documentType?: 'DNI' | 'RUC' | 'PASSPORT' | 'CE' | null
  customerType?: 'INDIVIDUAL' | 'BUSINESS' | 'CORPORATION'
  serviceType?: string | null
  contractDate?: Date | null
  creditLimit?: number | null
  notes?: string | null
  tags?: string[]
  priority?: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  source?: string | null
  assignedSeller?: string | null
}

// Función para construir el payload de creación de cliente
export function buildCreateCustomerPayload(formData: Partial<CreateCustomerPayload>): CreateCustomerPayload {
  return {
    name: formData.name || "",
    phone: formData.phone || "",
    address: formData.address || "",
    district: formData.district || "",
    email: formData.email || null,
    province: formData.province || null,
    department: formData.department || null,
    documentNumber: formData.documentNumber || null,
    documentType: formData.documentType || null,
    customerType: formData.customerType || "INDIVIDUAL",
    serviceType: formData.serviceType || null,
    contractDate: formData.contractDate || null,
    creditLimit: formData.creditLimit || null,
    notes: formData.notes || null,
    tags: formData.tags || [],
    priority: formData.priority || "MEDIA",
    source: formData.source || null,
    assignedSeller: formData.assignedSeller || null,
  }
}