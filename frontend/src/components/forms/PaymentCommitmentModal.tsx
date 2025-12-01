"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import apiFacade from "@/lib/apiFacade";
import { toast } from "sonner";
import { Customer } from "@/types/customer";
import { Calendar } from "lucide-react";

interface PaymentCommitmentModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
  onCommitmentCreated?: () => void;
}

const PaymentCommitmentModal: React.FC<PaymentCommitmentModalProps> = ({ 
  customer, 
  isOpen = true, 
  onClose,
  onCommitmentCreated 
}) => {
  const [commitmentDate, setCommitmentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [hasCommitment, setHasCommitment] = useState(false);
  const [currentCommitmentDate, setCurrentCommitmentDate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer?.billingAccount) {
      // Verificar si el cliente ya tiene un compromiso
      const commitmentDate = customer.billingAccount.paymentCommitmentDate;
      if (commitmentDate) {
        const date = new Date(commitmentDate);
        setCurrentCommitmentDate(date.toISOString().split("T")[0]);
        setCommitmentDate(date.toISOString().split("T")[0]);
        setNotes(customer.billingAccount.paymentCommitmentNotes || "");
        setHasCommitment(true);
      } else {
        // Establecer fecha mínima como mañana
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setCommitmentDate(tomorrow.toISOString().split("T")[0]);
        setNotes("");
        setHasCommitment(false);
      }
    }
  }, [isOpen, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!commitmentDate) {
        throw new Error("La fecha de compromiso es requerida");
      }

      const date = new Date(commitmentDate);
      if (date < new Date()) {
        throw new Error("La fecha de compromiso debe ser futura");
      }

      await apiFacade.createOrUpdatePaymentCommitment(
        customer.id,
        date,
        notes || undefined
      );

      toast.success(
        `Compromiso de pago ${hasCommitment ? 'actualizado' : 'creado'} exitosamente hasta el ${date.toLocaleDateString('es-PE')}`
      );
      
      onCommitmentCreated?.();
      onClose();
    } catch (error: any) {
      console.error("Error en PaymentCommitmentModal:", error);
      toast.error(`Error al ${hasCommitment ? 'actualizar' : 'crear'} el compromiso: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("¿Está seguro de eliminar el compromiso de pago?")) {
      return;
    }

    setIsRemoving(true);

    try {
      await apiFacade.removePaymentCommitment(customer.id);
      toast.success("Compromiso de pago eliminado exitosamente");
      onCommitmentCreated?.();
      onClose();
    } catch (error: any) {
      console.error("Error eliminando compromiso:", error);
      toast.error(`Error al eliminar el compromiso: ${error.message}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasCommitment ? "Actualizar" : "Crear"} Compromiso de Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commitmentDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Límite del Compromiso
              </Label>
              <Input
                id="commitmentDate"
                type="date"
                value={commitmentDate}
                onChange={(e) => setCommitmentDate(e.target.value)}
                min={minDateStr}
                required
                className="w-full"
              />
              {currentCommitmentDate && (
                <p className="text-xs text-muted-foreground">
                  Compromiso actual: {new Date(currentCommitmentDate).toLocaleDateString('es-PE')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas sobre el compromiso de pago..."
                className="min-h-[80px]"
              />
            </div>

            {customer.billingAccount?.balance && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>Saldo pendiente:</strong> S/ {Number(customer.billingAccount.balance).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  El servicio será reactivado hasta la fecha del compromiso. Si no se registra el pago antes de esa fecha, el servicio será cortado automáticamente.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            {hasCommitment && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                disabled={isRemoving || isSubmitting}
                className="w-full sm:w-auto"
              >
                {isRemoving ? "Eliminando..." : "Eliminar Compromiso"}
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isRemoving}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isRemoving}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Guardando..." : hasCommitment ? "Actualizar" : "Crear Compromiso"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentCommitmentModal;

