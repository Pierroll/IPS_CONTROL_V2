"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, Calendar, DollarSign, CreditCard } from "lucide-react";
import apiFacade from "@/lib/apiFacade";
import { AdvancePayment, AdvanceMonthlyPayment } from "@/types/advancePayment";

interface AdvancePaymentHistoryModalProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdvancePaymentDeleted: () => void;
}

export default function AdvancePaymentHistoryModal({ 
  customerId, 
  isOpen, 
  onClose, 
  onAdvancePaymentDeleted 
}: AdvancePaymentHistoryModalProps) {
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId || !isOpen) return;
    
    setLoading(true);
    apiFacade
      .getAdvancePaymentsByCustomer(customerId)
      .then((data) => {
        setAdvancePayments(data);
      })
      .catch((err) => {
        console.error("Error al cargar pagos adelantados:", err);
        toast.error("Error al cargar pagos adelantados");
      })
      .finally(() => setLoading(false));
  }, [customerId, isOpen]);

  const handleDelete = async (advancePaymentId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este pago adelantado? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeletingId(advancePaymentId);
    try {
      await apiFacade.deleteAdvancePayment(advancePaymentId);
      toast.success("Pago adelantado eliminado exitosamente");
      onAdvancePaymentDeleted();
      // Recargar la lista
      const data = await apiFacade.getAdvancePaymentsByCustomer(customerId);
      setAdvancePayments(data);
    } catch (error: any) {
      console.error("Error al eliminar pago adelantado:", error);
      toast.error(`Error al eliminar pago adelantado: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMonthlyStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pendiente</Badge>;
      case 'APPLIED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aplicado</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Efectivo';
      case 'BANK_TRANSFER': return 'Transferencia';
      case 'CREDIT_CARD': return 'Tarjeta de Crédito';
      case 'DEBIT_CARD': return 'Tarjeta de Débito';
      case 'CHECK': return 'Cheque';
      case 'DIGITAL_WALLET': return 'Billetera Digital';
      default: return method;
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || `Mes ${month}`;
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagos Adelantados</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando pagos adelantados...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagos Adelantados</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {advancePayments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay pagos adelantados registrados</p>
            </div>
          ) : (
            advancePayments.map((advancePayment) => (
              <Card key={advancePayment.id} className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Pago Adelantado - {advancePayment.monthsCount} {advancePayment.monthsCount === 1 ? 'mes' : 'meses'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(advancePayment.status)}
                      {advancePayment.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(advancePayment.id)}
                          disabled={deletingId === advancePayment.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Información del pago */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Monto Total:</span>
                        <span className="text-sm">S/ {Number(advancePayment.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Por Mes:</span>
                        <span className="text-sm">S/ {Number(advancePayment.amountPerMonth).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Método:</span>
                        <span className="text-sm">{getPaymentMethodLabel(advancePayment.paymentMethod)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Fecha:</span>
                        <span className="text-sm">{new Date(advancePayment.paymentDate).toLocaleDateString('es-PE')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Referencia y notas */}
                  {(advancePayment.reference || advancePayment.notes) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {advancePayment.reference && (
                          <div>
                            <span className="text-sm font-medium">Referencia: </span>
                            <span className="text-sm">{advancePayment.reference}</span>
                          </div>
                        )}
                        {advancePayment.notes && (
                          <div>
                            <span className="text-sm font-medium">Notas: </span>
                            <span className="text-sm">{advancePayment.notes}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Pagos mensuales */}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3">Pagos Mensuales:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {advancePayment.monthlyPayments.map((monthlyPayment) => (
                        <div key={monthlyPayment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {getMonthName(monthlyPayment.month)} {monthlyPayment.year}
                            </span>
                            <span className="text-sm text-gray-600">
                              S/ {Number(monthlyPayment.amount).toFixed(2)}
                            </span>
                          </div>
                          {getMonthlyStatusBadge(monthlyPayment.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
