export interface MessageLog {
  id: string;
  customerId: string;
  customer?: { name: string };
  message: string;
  channel: "WHATSAPP" | "SMS" | "EMAIL" | "PUSH" | "VOICE";
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "READ";
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  paymentId?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendManualReminderPayload {
  customerId: string;
}