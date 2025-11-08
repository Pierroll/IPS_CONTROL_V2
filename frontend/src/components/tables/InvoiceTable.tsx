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
          <TableHead className="min-w-[100px]">Número</TableHead>
          <TableHead className="min-w-[150px]">Cliente</TableHead>
          <TableHead className="whitespace-nowrap">Total</TableHead>
          <TableHead className="whitespace-nowrap hidden md:table-cell">Saldo Pendiente</TableHead>
          <TableHead className="min-w-[100px]">Estado</TableHead>
          <TableHead className="hidden lg:table-cell">Vencimiento</TableHead>
          <TableHead className="min-w-[140px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium" data-label="Número">{invoice.invoiceNumber}</TableCell>
            <TableCell className="min-w-[150px]" data-label="Cliente">{invoice.customer.name}</TableCell>
            <TableCell className="whitespace-nowrap font-mono" data-label="Total">S/ {invoice.total.toFixed(2)}</TableCell>
            <TableCell className="whitespace-nowrap font-mono hidden md:table-cell" data-label="Saldo Pendiente">S/ {invoice.balanceDue.toFixed(2)}</TableCell>
            <TableCell data-label="Estado"><span className="text-xs sm:text-sm">{invoice.status}</span></TableCell>
            <TableCell className="hidden lg:table-cell" data-label="Vencimiento">{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
            <TableCell data-label="Acciones">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendReminder(invoice.customerId)}
                disabled={invoice.status === "PAID"}
                className="h-8 w-auto px-2 sm:px-3 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Enviar Recordatorio</span>
                <span className="sm:hidden">Recordatorio</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}