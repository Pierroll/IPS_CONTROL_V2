"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: { name: string };
  total: number;
  balanceDue: number;
  status: string;
  dueDate: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onSendReminder: (customerId: string) => void;
}

export default function InvoiceTable({ invoices, onSendReminder }: InvoiceTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Saldo Pendiente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Vencimiento</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>{invoice.invoiceNumber}</TableCell>
            <TableCell>{invoice.customer.name}</TableCell>
            <TableCell>S/ {invoice.total.toFixed(2)}</TableCell>
            <TableCell>S/ {invoice.balanceDue.toFixed(2)}</TableCell>
            <TableCell>{invoice.status}</TableCell>
            <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendReminder(invoice.customerId)}
                disabled={invoice.status === "PAID"}
              >
                Enviar Recordatorio
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}