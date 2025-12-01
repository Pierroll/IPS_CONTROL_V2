"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, DollarSign, CreditCard, Trash2, Download, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import apiFacade from "@/lib/apiFacade";
import { Customer } from "@/types/customer";

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  status: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
  };
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function PaymentHistoryModal({ isOpen, onClose, customer }: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    console.log("🔔 PaymentHistoryModal useEffect:", { isOpen, customer: customer?.id, customerName: customer?.name });
    if (isOpen && customer) {
      console.log("✅ Abriendo modal de historial de pagos para cliente:", customer.name);
      loadPayments();
    }
  }, [isOpen, customer]);

  const loadPayments = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const response = await apiFacade.listPayments({ customerId: customer.id });
      console.log("📋 Pagos cargados:", response);
      console.log("📊 Estados de pagos:", response?.map((p: any) => ({ 
        id: p.id, 
        status: p.status, 
        statusType: typeof p.status,
        hasStatus: 'status' in p,
        allKeys: Object.keys(p)
      })));
      
      // Asegurar que todos los pagos tengan un status
      const paymentsWithStatus = (response || []).map((p: any) => ({
        ...p,
        status: p.status || 'COMPLETED' // Si no tiene status, asumir COMPLETED
      }));
      
      setPayments(paymentsWithStatus);
    } catch (error) {
      console.error("Error cargando pagos:", error);
      toast.error("Error al cargar el historial de pagos");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeletingId(paymentId);
    try {
      await apiFacade.deletePayment(paymentId);
      toast.success("Pago eliminado exitosamente");
      loadPayments(); // Recargar la lista
    } catch (error) {
      console.error("Error eliminando pago:", error);
      toast.error("Error al eliminar el pago");
    } finally {
      setDeletingId(null);
    }
  };

  const handleVoidPayment = (paymentId: string) => {
    setVoidingId(paymentId);
    setVoidReason("");
    setShowVoidModal(true);
  };

  const confirmVoidPayment = async () => {
    if (!voidingId) return;

    if (!voidReason.trim()) {
      toast.error("Por favor, ingresa una razón para anular el pago");
      return;
    }

    try {
      await apiFacade.voidPayment(voidingId, voidReason);
      toast.success("Pago anulado exitosamente");
      setShowVoidModal(false);
      setVoidReason("");
      setVoidingId(null);
      loadPayments(); // Recargar la lista
    } catch (error: any) {
      console.error("Error anulando pago:", error);
      toast.error(error.message || "Error al anular el pago");
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      CASH: "Efectivo",
      TRANSFER: "Transferencia",
      YAPE: "Yape",
      PLIN: "Plin",
      BCP: "BCP",
      BANCO_NACION: "Banco de la Nación",
      CAJA_PIURA: "Caja Piura",
      OTHER: "Otro"
    };
    return methods[method] || method;
  };

  const handleCancelVoid = () => {
    setShowVoidModal(false);
    setVoidReason("");
    setVoidingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completado</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!customer) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de Pagos - {customer.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Cargando historial de pagos...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay pagos registrados</p>
            </div>
          ) : (
            payments.map((payment) => {
              // Asegurar que el pago tenga status
              const paymentStatus = payment.status || 'COMPLETED';
              
              return (
              <Card key={payment.id} className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg">
                      Pago #{payment.id.slice(-8)}
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      {getStatusBadge(paymentStatus)}
                      {/* DEBUG: Mostrar siempre los botones para verificar que se renderizan */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log("🖱️ Click en botón Anular para pago:", payment.id);
                          handleVoidPayment(payment.id);
                        }}
                        disabled={voidingId === payment.id || paymentStatus.toUpperCase() === 'CANCELLED'}
                        className="text-orange-600 hover:text-orange-700 border-orange-300 hover:bg-orange-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        <span>Anular</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePayment(payment.id)}
                        disabled={deletingId === payment.id || paymentStatus.toUpperCase() === 'CANCELLED'}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Información del pago */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Monto:</span>
                        <span className="text-sm">S/ {Number(payment.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CreditCard className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Método:</span>
                        <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Fecha:</span>
                        <span className="text-sm">{new Date(payment.paymentDate).toLocaleDateString('es-PE')}</span>
                      </div>
                      {payment.reference && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Referencia:</span>
                          <span className="text-sm break-all">{payment.reference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Factura asociada */}
                  {payment.invoice && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2">Factura Asociada:</h4>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <span className="text-sm font-medium">
                              #{payment.invoice.invoiceNumber}
                            </span>
                            <span className="text-sm text-gray-600">
                              Total: S/ {Number(payment.invoice.total).toFixed(2)}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/billing/invoices/${payment.invoice?.id}/pdf`, '_blank')}
                            className="w-full sm:w-auto"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            <span className="sm:hidden">Descargar</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notas */}
                  {payment.notes && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm font-medium">Notas: </span>
                        <span className="text-sm">{payment.notes}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal para anular pago - Renderizado fuera del modal padre para evitar conflictos de accesibilidad */}
    <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular Pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres anular este pago? Esta acción revertirá los efectos del pago pero mantendrá el registro para auditoría.
          </p>
          <div className="space-y-2">
            <Label htmlFor="voidReason">Razón de anulación *</Label>
            <Textarea
              id="voidReason"
              placeholder="Ej: Error en el registro, pago duplicado, etc."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancelVoid}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmVoidPayment}
            disabled={!voidReason.trim()}
          >
            Anular Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}