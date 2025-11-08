"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, DollarSign, Plus, Trash2 } from "lucide-react";
import apiFacade from "@/lib/apiFacade";
import { Customer } from "@/types/customer";
import { CreateAdvancePaymentPayload, AdvancePaymentMonth } from "@/types/advancePayment";
import dayjs from "dayjs";

interface AdvancePaymentModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvancePaymentCreated: () => void;
}

interface FormData {
  paymentMethod: string;
  reference: string;
  notes: string;
  paymentDate: string;
}

const AdvancePaymentModal: React.FC<AdvancePaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onAdvancePaymentCreated
}) => {
  const [formData, setFormData] = useState<FormData>({
    paymentMethod: "CASH",
    reference: "",
    notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });
  const [selectedMonths, setSelectedMonths] = useState<AdvancePaymentMonth[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpiar formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        paymentMethod: "CASH",
        reference: "",
        notes: "",
        paymentDate: new Date().toISOString().split("T")[0],
      });
      setSelectedMonths([]);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMonthToggle = (month: number, year: number, amount: number) => {
    const monthKey = `${year}-${month}`;
    const existingIndex = selectedMonths.findIndex(m => m.month === month && m.year === year);
    
    if (existingIndex >= 0) {
      // Remover mes seleccionado
      setSelectedMonths(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Agregar mes seleccionado
      setSelectedMonths(prev => [...prev, { month, year, amount }]);
    }
  };

  const handleAmountChange = (month: number, year: number, newAmount: number) => {
    setSelectedMonths(prev => 
      prev.map(m => 
        m.month === month && m.year === year 
          ? { ...m, amount: newAmount }
          : m
      )
    );
  };

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || `Mes ${month}`;
  };

  const generateAvailableMonths = () => {
    const currentDate = dayjs();
    const currentMonth = currentDate.month() + 1;
    const currentYear = currentDate.year();
    const months = [];

    // Obtener meses ya pagados adelantado
    const paidMonths = new Set();
    if (customer.advancePayments) {
      customer.advancePayments.forEach(ap => {
        if (ap.status === 'ACTIVE') {
          ap.monthlyPayments.forEach(mp => {
            if (mp.status === 'PENDING') {
              paidMonths.add(`${mp.year}-${mp.month}`);
            }
          });
        }
      });
    }

    // Generar meses desde el próximo mes hasta diciembre del año actual
    for (let month = currentMonth + 1; month <= 12; month++) {
      const monthKey = `${currentYear}-${month}`;
      if (!paidMonths.has(monthKey)) {
        months.push({ month, year: currentYear });
      }
    }

    // Generar todos los meses del próximo año
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${currentYear + 1}-${month}`;
      if (!paidMonths.has(monthKey)) {
        months.push({ month, year: currentYear + 1 });
      }
    }

    return months;
  };

  const totalAmount = selectedMonths.reduce((sum, month) => sum + month.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer) {
      toast.error("No se ha seleccionado un cliente");
      return;
    }

    if (selectedMonths.length === 0) {
      toast.error("Debe seleccionar al menos un mes");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateAdvancePaymentPayload = {
        customerId: customer.id,
        months: selectedMonths,
        paymentMethod: formData.paymentMethod as any,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        paymentDate: new Date(formData.paymentDate),
      };

      console.log("Enviando pago adelantado:", payload);

      await apiFacade.createAdvancePayment(payload);
      toast.success(`Pago adelantado de S/ ${totalAmount.toFixed(2)} por ${selectedMonths.length} meses creado exitosamente`);
      onAdvancePaymentCreated();
      onClose();
    } catch (error: any) {
      console.error("Error al crear pago adelantado:", error);
      toast.error(`Error al crear pago adelantado: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  const availableMonths = generateAvailableMonths();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago Adelantado - {customer.name}</DialogTitle>
        </DialogHeader>
        
        <form id="advance-payment-form" onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2 sm:py-4">
            {/* Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center">
              <Label htmlFor="customer" className="text-sm sm:text-base sm:text-right">
                Cliente
              </Label>
              <div className="col-span-1 sm:col-span-3 w-full">
                <Input
                  id="customer"
                  value={`${customer.name} (${customer.code})`}
                  disabled
                  className="bg-gray-50 w-full"
                />
              </div>
            </div>

            {/* Selección de Meses */}
            <div className="space-y-4">
              <Label className="text-sm sm:text-base font-medium">Seleccionar Meses a Pagar</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {availableMonths.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 text-center py-4 text-gray-500 text-sm sm:text-base">
                    <p>✅ Todos los meses futuros ya están pagados adelantado</p>
                    <p className="text-xs sm:text-sm">No hay meses disponibles para pagar adelantado</p>
                  </div>
                ) : (
                  availableMonths.map(({ month, year }) => {
                    const isSelected = selectedMonths.some(m => m.month === month && m.year === year);
                    const selectedMonth = selectedMonths.find(m => m.month === month && m.year === year);
                    const amount = selectedMonth?.amount || 60; // Monto por defecto

                    return (
                      <div key={`${year}-${month}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 border rounded">
                        <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
                          <Checkbox
                            id={`month-${year}-${month}`}
                            checked={isSelected}
                            onCheckedChange={() => handleMonthToggle(month, year, amount)}
                            disabled={isSubmitting}
                          />
                          <Label htmlFor={`month-${year}-${month}`} className="flex-1 text-sm sm:text-base">
                            {getMonthName(month)} {year}
                          </Label>
                        </div>
                        {isSelected && (
                          <div className="flex items-center space-x-1 w-full sm:w-auto">
                            <Input
                              type="number"
                              value={amount}
                              onChange={(e) => handleAmountChange(month, year, parseFloat(e.target.value) || 0)}
                              className="w-full sm:w-20 h-8 text-sm"
                              min="0"
                              step="0.01"
                              disabled={isSubmitting}
                            />
                            <span className="text-xs text-gray-500">S/</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Resumen */}
            {selectedMonths.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total a Pagar:</span>
                  <span className="text-lg font-bold text-blue-600">
                    S/ {totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedMonths.length} {selectedMonths.length === 1 ? 'mes' : 'meses'} seleccionados
                </div>
              </div>
            )}

            {/* Método de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center">
              <Label htmlFor="paymentMethod" className="text-sm sm:text-base sm:text-right">
                Método
              </Label>
              <div className="col-span-1 sm:col-span-3 w-full">
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transferencia Bancaria</SelectItem>
                    <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="DEBIT_CARD">Tarjeta de Débito</SelectItem>
                    <SelectItem value="CHECK">Cheque</SelectItem>
                    <SelectItem value="DIGITAL_WALLET">Billetera Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center">
              <Label htmlFor="reference" className="text-sm sm:text-base sm:text-right">
                Referencia
              </Label>
              <div className="col-span-1 sm:col-span-3 w-full">
                <Input
                  id="reference"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="Número de operación, voucher, etc."
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>
            </div>

            {/* Fecha de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center">
              <Label htmlFor="paymentDate" className="text-sm sm:text-base sm:text-right">
                Fecha
              </Label>
              <div className="col-span-1 sm:col-span-3 w-full">
                <Input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center">
              <Label htmlFor="notes" className="text-sm sm:text-base sm:text-right">
                Notas
              </Label>
              <div className="col-span-1 sm:col-span-3 w-full">
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Notas adicionales..."
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full resize-y"
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="advance-payment-form" 
            disabled={isSubmitting || selectedMonths.length === 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Creando..." : "Crear Pago Adelantado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancePaymentModal;