import { Customer } from "./customer";
import { CustomerPlan } from "./customerPlan";

export interface BillingAccount {
  id: string;
  customerId: string;
  balance: number;
  creditLimit: number | null;
  status: string;
  billingCycle: number;
  autoSuspend: boolean;
  suspendedAt: Date | null;
  lastPaymentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer & { customerPlans: CustomerPlan[] };
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  planId?: string;
  ticketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  customerId: string;
  billingAccountId: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date;
  status: string;
  currency: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items: InvoiceItem[];
  payments?: Payment[];
}

export interface Payment {
  id: string;
  customerId: string;
  billingAccountId: string;
  invoiceId?: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference?: string;
  status: string;
  paymentDate: Date;
  processedDate?: Date;
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoicePayload {
  customerId: string;
  periodStart: Date;
  periodEnd: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    planId?: string;
    ticketId?: string;
  }>;
  tax?: number;
  discount?: number;
  notes?: string;
  currency?: string;
}

export interface RecordPaymentPayload {
  customerId: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  paymentDate?: Date;
  notes?: string;
}