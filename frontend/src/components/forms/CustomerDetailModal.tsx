"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Customer } from "@/types/customer"

interface CustomerDetailModalProps {
  customer: Customer | null
  onClose: () => void
}

export default function CustomerDetailModal({ customer, onClose }: CustomerDetailModalProps) {
  if (!customer) return null

  const activePlan = customer.customerPlans?.length > 0 ? customer.customerPlans[0] : null
  const pppoeAccount = customer.pppoeAccounts?.length > 0 ? customer.pppoeAccounts[0] : null

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px]" aria-describedby="customer-detail-description">
        <DialogHeader>
          <DialogTitle>Detalles del Cliente</DialogTitle>
          <DialogDescription id="customer-detail-description">
            Información detallada del cliente {customer.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Código</Label>
            <p>{customer.code || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Nombre</Label>
            <p>{customer.name || "Sin nombre"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Email</Label>
            <p>{customer.email || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Teléfono</Label>
            <p>{customer.phone || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Dirección</Label>
            <p>{customer.address || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Distrito</Label>
            <p>{customer.district || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Referencia</Label>
            <p>{customer.notes || "N/A"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Plan Asignado</Label>
            <p>{activePlan ? activePlan.plan.name : "Sin plan asignado"}</p>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Estado de la Asignación</Label>
            <Badge
              variant={activePlan ? (activePlan.status === "ACTIVE" ? "default" : "secondary") : "outline"}
            >
              {activePlan ? activePlan.status : "Sin asignación"}
            </Badge>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Fecha de Inicio del Plan</Label>
            <p>
              {activePlan
                ? new Date(activePlan.startDate).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </p>
          </div>
          {pppoeAccount && (
            <div className="space-y-2 border-t pt-4 mt-4">
              <h4 className="font-medium text-lg">Cuenta PPPoE</h4>
              <div className="space-y-2">
                <Label className="font-medium">Usuario PPPoE</Label>
                <p>{pppoeAccount.username}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Perfil PPPoE</Label>
                <p>{pppoeAccount.profile || "N/A"}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Router</Label>
                <p>{pppoeAccount.device?.name || "N/A"} ({pppoeAccount.device?.ipAddress || "N/A"})</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}