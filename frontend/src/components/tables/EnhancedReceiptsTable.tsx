"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/types/customer";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Router, Phone, DollarSign, FileText, History, CreditCard, Clock } from "lucide-react";

interface EnhancedReceiptsTableProps {
  customers: Customer[];
  onPaymentClick: (customer: Customer) => void;
  onDownloadReceipt: (customerId: string) => void;
  onViewHistory: (customerId: string) => void;
  onAdvancePaymentClick: (customer: Customer) => void;
  onAdvancePaymentHistoryClick: (customerId: string) => void;
  onPaymentHistoryClick: (customer: Customer) => void;
}

export default function EnhancedReceiptsTable({ 
  customers, 
  onPaymentClick, 
  onDownloadReceipt,
  onViewHistory,
  onAdvancePaymentClick,
  onAdvancePaymentHistoryClick,
  onPaymentHistoryClick
}: EnhancedReceiptsTableProps) {
  
  // Función para determinar el color de la fila según el estado de pago
  const getRowColor = (customer: Customer) => {
    const paymentStatus = (customer as any).paymentStatus;
    
    switch (paymentStatus) {
      case 'OVERDUE':
        return "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500";
      case 'ADVANCE_PAID':
        return "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500";
      case 'PARTIAL_ADVANCE':
        return "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500";
      case 'CREDIT':
        return "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500";
      default:
        return "bg-gray-50 hover:bg-gray-100 border-l-4 border-l-gray-500";
    }
  };

  // Función para obtener el estado de pago
  const getPaymentStatus = (customer: Customer) => {
    const paymentStatus = (customer as any).paymentStatus;
    const statusMessage = (customer as any).statusMessage;
    
    switch (paymentStatus) {
      case 'OVERDUE':
        return { label: statusMessage || "En Deuda", variant: "destructive" as const };
      case 'ADVANCE_PAID':
        return { label: statusMessage || "Pagado Adelantado", variant: "default" as const };
      case 'PARTIAL_ADVANCE':
        return { label: statusMessage || "Pago Parcial", variant: "secondary" as const };
      case 'CREDIT':
        return { label: statusMessage || "A Favor", variant: "default" as const };
      default:
        return { label: statusMessage || "Al Día", variant: "secondary" as const };
    }
  };

  // Función para extraer información del MikroTik de las notas
  const getMikrotikInfo = (notes: string | null) => {
    if (!notes) return null;
    
    // Buscar información del router en las notas con diferentes patrones
    const routerPatterns = [
      /routerId:([^,\n]+)/i,
      /Router: ([^,\n]+)/i,
      /MikroTik: ([^,\n]+)/i,
      /router[:\s]+([^,\n]+)/i
    ];
    
    let routerId = null;
    for (const pattern of routerPatterns) {
      const match = notes.match(pattern);
      if (match) {
        routerId = match[1].trim();
        break;
      }
    }
    
    // Buscar username PPPoE
    const usernameMatch = notes.match(/Usuario PPPoE (creado|actualizado): ([^,\n]+)/i);
    
    return {
      routerId,
      username: usernameMatch ? usernameMatch[2] : null
    };
  };

  // Función para formatear el mes de deuda
  const getDebtMonth = (customer: Customer) => {
    const latestInvoice = customer.invoices?.[0];
    if (!latestInvoice) return "Sin factura";
    
    // Asegurar que se use la fecha correcta sin problemas de zona horaria
    const periodStart = new Date(latestInvoice.periodStart);
    // Usar toLocaleString con timeZone para asegurar consistencia
    return periodStart.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Lima'
    });
  };

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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold min-w-[150px]">Cliente</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Ubicación</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">MikroTik</TableHead>
            <TableHead className="font-semibold min-w-[120px]">Plan</TableHead>
            <TableHead className="font-semibold min-w-[100px]">Estado</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Saldo</TableHead>
            <TableHead className="font-semibold hidden xl:table-cell">Mes Deuda</TableHead>
            <TableHead className="font-semibold min-w-[200px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const mikrotikInfo = getMikrotikInfo(customer.notes);
            const paymentStatus = getPaymentStatus(customer);
            const debtMonth = getDebtMonth(customer);
            
            return (
              <TableRow 
                key={customer.id} 
                className={cn("transition-colors", getRowColor(customer))}
              >
                {/* Cliente */}
                <TableCell className="font-medium" data-label="Cliente">
                  <div className="flex flex-col">
                    <span className="font-semibold">{customer.name}</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Ubicación */}
                <TableCell className="hidden md:table-cell" data-label="Ubicación">
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{customer.district || "N/A"}</span>
                      {customer.province && (
                        <span className="text-xs text-muted-foreground">
                          {customer.province}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* MikroTik */}
                <TableCell className="hidden lg:table-cell" data-label="MikroTik">
                  {mikrotikInfo?.routerId ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Router className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">
                          {mikrotikInfo.routerId}
                        </span>
                        {mikrotikInfo.username && (
                          <span className="text-xs text-muted-foreground">
                            {mikrotikInfo.username}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin MikroTik</span>
                  )}
                </TableCell>

                {/* Plan */}
                <TableCell data-label="Plan">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {customer.customerPlans?.[0]?.plan?.name || "Sin plan"}
                    </span>
                    {customer.customerPlans?.[0]?.plan?.monthlyPrice && (
                      <span className="text-sm text-muted-foreground">
                        S/ {customer.customerPlans[0].plan.monthlyPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Estado */}
                <TableCell data-label="Estado">
                  <Badge variant={paymentStatus.variant} className="text-xs">
                    {paymentStatus.label}
                  </Badge>
                </TableCell>

                {/* Saldo */}
                <TableCell data-label="Saldo">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className={cn(
                      "font-mono text-sm",
                      (customer.billingAccount?.balance || 0) > 0 
                        ? "text-red-600 font-semibold" 
                        : (customer.billingAccount?.balance || 0) < 0 
                        ? "text-green-600 font-semibold"
                        : "text-muted-foreground"
                    )}>
                      S/ {(customer.billingAccount?.balance || 0).toFixed(2)}
                    </span>
                  </div>
                </TableCell>

                {/* Mes de Deuda */}
                <TableCell className="hidden xl:table-cell" data-label="Mes Deuda">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{debtMonth}</span>
                  </div>
                </TableCell>

                {/* Acciones */}
                <TableCell data-label="Acciones">
                  <div className="flex gap-1 flex-wrap">
                    {customer.billingAccount && customer.billingAccount.balance > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPaymentClick(customer)}
                        className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                      >
                        <DollarSign className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Pagar</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewHistory(customer.id)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                    >
                      <History className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Historial</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownloadReceipt(customer.id)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                    >
                      <FileText className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Recibo</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAdvancePaymentClick(customer)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3 bg-blue-50 hover:bg-blue-100 text-blue-700"
                    >
                      <CreditCard className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Adelantado</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAdvancePaymentHistoryClick(customer.id)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 hidden lg:inline-flex"
                    >
                      <Clock className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Ver Adelantos</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPaymentHistoryClick(customer)}
                      className="text-xs h-7 sm:h-8 px-2 sm:px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hidden lg:inline-flex"
                    >
                      <History className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Historial</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
