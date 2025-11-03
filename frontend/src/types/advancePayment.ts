export interface AdvancePayment {
  id: string;
  customerId: string;
  billingAccountId: string;
  totalAmount: number;
  monthsCount: number;
  amountPerMonth: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  paymentDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: {
    id: string;
    name: string;
    code: string;
    phone: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  monthlyPayments: AdvanceMonthlyPayment[];
}

export interface AdvanceMonthlyPayment {
  id: string;
  advancePaymentId: string;
  month: number; // 1-12
  year: number; // 2025, 2026, etc.
  amount: number;
  status: 'PENDING' | 'APPLIED' | 'CANCELLED';
  appliedAt?: Date | null;
  appliedToInvoiceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  appliedToInvoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
  };
}

export interface AdvancePaymentMonth {
  month: number; // 1-12 (enero-diciembre)
  year: number; // 2025, 2026, etc.
  amount: number;
}

export interface CreateAdvancePaymentPayload {
  customerId: string;
  months: AdvancePaymentMonth[];
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  paymentDate?: Date;
}

export interface DeleteAdvancePaymentPayload {
  advancePaymentId: string;
}

export type PaymentMethod = 
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CHECK'
  | 'DIGITAL_WALLET';

export type AdvancePaymentStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
export type AdvanceMonthlyStatus = 'PENDING' | 'APPLIED' | 'CANCELLED';
