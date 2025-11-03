export type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" | "VOID";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "CHECK" | "DIGITAL_WALLET";
export type BillingStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type LedgerType = "DEBIT" | "CREDIT";

export interface BillingAccount {
  id: string;
  customerId: string;
  balance: number;
  creditLimit?: number | null;
  status: BillingStatus;
  suspendedAt?: Date | null;
  lastPaymentDate?: Date | null;
  billingCycle: number;
  autoSuspend: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  planId?: string | null;
  ticketId?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  billingAccountId: string;
  periodStart: Date;
  periodEnd: Date;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  notes?: string | null;
  currency: "PEN" | "USD";
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItem[];
}

export interface CreateInvoicePayload {
  customerId: string;
  periodStart: Date;
  periodEnd: Date;
  items: Array<Pick<InvoiceItem, "description" | "quantity" | "unitPrice" | "planId" | "ticketId">>;
  tax?: number;
  discount?: number;
  notes?: string | null;
  currency?: "PEN" | "USD";
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  billingAccountId: string;
  invoiceId?: string | null;
  amount: number;
  currency: "PEN" | "USD";
  paymentMethod: PaymentMethod;
  walletProvider?: string | null;
  reference?: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";
  paymentDate: Date;
  processedDate?: Date | null;
  notes?: string | null;
  receiptUrl?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordPaymentPayload {
  customerId: string;
  invoiceId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  walletProvider?: string | null;
  reference?: string | null;
  paymentDate?: Date;
  notes?: string | null;
  createdBy: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  billingAccountId: string;
  type: LedgerType;
  amount: number;
  description: string;
  invoiceId?: string | null;
  paymentId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  transactionDate: Date;
  createdAt: Date;
}

export interface InternalReceipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  invoiceId?: string | null;
  amount: number;
  description: string;
  receiptType: "SERVICE" | "INSTALLATION" | "MAINTENANCE" | "REFUND";
  createdBy: string;
  createdAt: Date;
}