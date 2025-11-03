"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiFacade from "@/lib/apiFacade";
import { toast } from "sonner";
import { Customer } from "@/types/customer";
import { RecordPaymentPayload } from "@/types/billing";

interface RecordPaymentModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

interface PaymentFormData {
  amount: string;               // UI only (bloqueado)
  paymentMethod: string;
  walletProvider?: string;
  reference: string;
  paymentDate: string;
  notes: string;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ customer, isOpen = true, onClose, onPaymentRecorded }) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: "",
    paymentMethod: "CASH",
    reference: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Saldo vigente desde el cliente (fuente de la verdad en el frontend)
  const currentBalance = useMemo(() => {
    const raw = Number(customer?.billingAccount?.balance ?? 0);
    return Number.isFinite(raw) ? raw : 0;
  }, [customer]);

  // ✅ Al abrir/cambiar cliente, precargar el monto y bloquear edición
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      amount: currentBalance.toFixed(2),
    }));
  }, [currentBalance, customer?.id, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
      if (!userData.id) {
        throw new Error("No se encontró el ID del usuario en localStorage");
      }

      // ✅ Tomamos SIEMPRE el saldo actual (no el valor del input)
      const payAmount = Number(currentBalance.toFixed(2));

      if (payAmount <= 0) {
        throw new Error("El cliente no presenta saldo pendiente por pagar.");
      }

      if (formData.paymentMethod === "DIGITAL_WALLET" && !formData.walletProvider) {
        throw new Error("Selecciona el proveedor de la billetera digital.");
      }

      const payload: RecordPaymentPayload = {
        customerId: customer.id,
        amount: payAmount,
        paymentMethod: formData.paymentMethod as
          | "CASH"
          | "BANK_TRANSFER"
          | "CREDIT_CARD"
          | "DEBIT_CARD"
          | "CHECK"
          | "DIGITAL_WALLET",
        walletProvider: formData.paymentMethod === "DIGITAL_WALLET" ? formData.walletProvider : undefined,
        reference: formData.reference || undefined,
        paymentDate: new Date(formData.paymentDate),
        notes: formData.notes || undefined,
        createdBy: userData.id,
      };

      console.log("Enviando payload a recordPayment:", payload);

      await apiFacade.recordPayment(payload);
      toast.success(`Pago de S/ ${payAmount.toFixed(2)} registrado. El recibo fue enviado al cliente.`);
      onPaymentRecorded();
      onClose();
    } catch (error: any) {
      console.error("Error en RecordPaymentModal:", error);
      toast.error(`Error al registrar el pago: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Registrar Pago para {customer?.name ?? "Cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Monto (solo lectura, precargado con la deuda actual) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Monto</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                readOnly
                className="col-span-3"
              />
            </div>

            {/* Método de pago */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">Método de Pago</Label>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onValueChange={(value) => handleSelectChange("paymentMethod", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un método" />
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

            {/* Proveedor si billetera */}
            {formData.paymentMethod === "DIGITAL_WALLET" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="walletProvider" className="text-right">Proveedor</Label>
                <Select
                  name="walletProvider"
                  value={formData.walletProvider || ""}
                  onValueChange={(value) => handleSelectChange("walletProvider", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YAPE">Yape</SelectItem>
                    <SelectItem value="PLIN">Plin</SelectItem>
                    <SelectItem value="MERCADO_PAGO">Mercado Pago</SelectItem>
                    <SelectItem value="OTHER">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Referencia */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reference" className="text-right">Referencia</Label>
              <Input
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            {/* Fecha de pago */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDate" className="text-right">Fecha de Pago</Label>
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>

            {/* Notas */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notas</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-3 border rounded p-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || currentBalance <= 0}>
              {isSubmitting ? "Procesando..." : `Registrar Pago (S/ ${currentBalance.toFixed(2)})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentModal;
