"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Customer } from "@/types/customer";
import apiFacade from "@/lib/apiFacade";
import { useEffect, useState } from "react";

interface ReceiptsTableProps {
  customers: Customer[];
  onPaymentClick: (customer: Customer) => void;
  onDownloadReceipt: (customerId: string) => void;
  onViewHistory: (customerId: string) => void;
}

export default function ReceiptsTable({ 
  customers, 
  onPaymentClick, 
  onDownloadReceipt,
  onViewHistory 
}: ReceiptsTableProps) {
  const [paymentMethods, setPaymentMethods] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // ✅ Validar que customers exista y sea un array
    if (!customers || !Array.isArray(customers) || customers.length === 0) return;
    
    const fetchPaymentMethods = async () => {
      const methods: { [key: string]: string } = {};
      for (const customer of customers) {
        try {
          const payments = await apiFacade.getPayments({ customerId: customer.id });
          const lastPayment = payments[0];
          methods[customer.id] = lastPayment
            ? `${lastPayment.paymentMethod}${lastPayment.walletProvider ? ` (${lastPayment.walletProvider})` : ""}`
            : "N/A";
        } catch (err) {
          console.error("Error fetching payment for customer", customer.id, err);
          methods[customer.id] = "N/A";
        }
      }
      setPaymentMethods(methods);
    };
    fetchPaymentMethods();
  }, [customers]);

  // ✅ Manejar casos de clientes vacíos o undefined
  if (!customers || !Array.isArray(customers)) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Error cargando clientes
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No hay clientes para mostrar
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Saldo</TableHead>
          <TableHead>Método de Pago</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>{customer.name}</TableCell>
            <TableCell>{customer.phone}</TableCell>
            <TableCell>{customer.customerPlans?.[0]?.plan?.name || "Sin plan"}</TableCell>
            <TableCell>S/ {customer.billingAccount?.balance?.toFixed(2) || "0.00"}</TableCell>
            <TableCell>{paymentMethods[customer.id] || "N/A"}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                {customer.billingAccount && customer.billingAccount.balance > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPaymentClick(customer)}
                  >
                    Registrar Pago
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewHistory(customer.id)}
                >
                  Ver Historial
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}