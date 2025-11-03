// frontend/src/components/forms/ViewAssignmentModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CustomerPlan } from "@/types/customerPlan"
import { Customer } from "@/types/customer"
import { Plan } from "@/types/plan"
import apiFacade from "@/lib/apiFacade"
import { Badge } from "@/components/ui/badge"

interface ViewAssignmentModalProps {
  assignmentId: string
  onClose: () => void
}

export default function ViewAssignmentModal({ assignmentId, onClose }: ViewAssignmentModalProps) {
  const [assignment, setAssignment] = useState<CustomerPlan | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFacade.getCustomerPlanById(assignmentId),
      apiFacade.getCustomers(),
      apiFacade.getPlans(),
    ])
      .then(([assignmentData, customersData, plansData]) => {
        setAssignment(assignmentData)
        setCustomers(customersData)
        setPlans(plansData.filter((p) => !p.deletedAt))
        setLoading(false)
      })
      .catch((err) => {
        apiFacade.handleApiError(err as Error)
        setError("Error al cargar datos")
        setLoading(false)
      })
  }, [assignmentId])

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !assignment) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{error || "No se encontraron datos de la asignación"}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer?.name || "N/A"
  }

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    return plan?.name || "N/A"
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle>Detalles de Asignación</DialogTitle>
          <DialogDescription id="view-assignment-description">
            Información detallada de la asignación de plan.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <p className="text-foreground">{getCustomerName(assignment.customerId)}</p>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <p className="text-foreground">{getPlanName(assignment.planId)}</p>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Badge variant={assignment.status === "ACTIVE" ? "default" : "secondary"}>
                {assignment.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <p className="text-foreground">{assignment.startDate.toLocaleDateString("es-ES")}</p>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Fin</Label>
              <p className="text-foreground">{assignment.endDate ? assignment.endDate.toLocaleDateString("es-ES") : "N/A"}</p>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cambio</Label>
              <p className="text-foreground">{assignment.changeType || "N/A"}</p>
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Motivo del Cambio</Label>
              <p className="text-foreground">{assignment.changeReason || "N/A"}</p>
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Notas</Label>
              <p className="text-foreground">{assignment.notes || "N/A"}</p>
            </div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-background py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
