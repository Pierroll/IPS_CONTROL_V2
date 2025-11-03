"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CustomerPlan } from "@/types/customerPlan"
import { Plan } from "@/types/plan"
import apiFacade from "@/lib/apiFacade"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface EditAssignmentModalProps {
  assignmentId: string
  onAssignmentUpdated: () => void
  onClose: () => void
}

type ChangeType = "UPGRADE" | "DOWNGRADE" | "LATERAL" | "SUSPENSION" | "REACTIVATION"

export default function EditAssignmentModal({ assignmentId, onAssignmentUpdated, onClose }: EditAssignmentModalProps) {
  const [formData, setFormData] = useState<Partial<CustomerPlan>>({ status: "ACTIVE" })
  const [customerName, setCustomerName] = useState<string>("")
  const [plans, setPlans] = useState<Plan[]>([])
  const [previousPlans, setPreviousPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [changeType, setChangeType] = useState<ChangeType | null>(null)
  const [previousPlanId, setPreviousPlanId] = useState<string>("")
  const [endDateStr, setEndDateStr] = useState<string>("")
  const [changeReason, setChangeReason] = useState<string>("")

  const requiresPreviousPlan = changeType === "UPGRADE" || changeType === "DOWNGRADE" || changeType === "LATERAL"
  const computedStatus: "ACTIVE" | "SUSPENDED" = changeType === "SUSPENSION" ? "SUSPENDED" : "ACTIVE"
  const isValid = formData.planId && formData.startDate && (!requiresPreviousPlan || (previousPlanId && previousPlanId !== formData.planId))

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFacade.getCustomerPlanById(assignmentId),
      apiFacade.getPlans(),
    ])
      .then(([assignmentData, plansData]) => {
        const activePlans = plansData.filter((p) => !p.deletedAt)
        const previousPlan = assignmentData.previousPlan ? [assignmentData.previousPlan] : []
        setFormData({
          customerId: assignmentData.customerId,
          planId: assignmentData.planId,
          startDate: assignmentData.startDate ? new Date(assignmentData.startDate) : undefined,
          status: assignmentData.status || "ACTIVE",
          changeType: assignmentData.changeType || null,
          previousPlanId: assignmentData.previousPlanId,
          endDate: assignmentData.endDate ? new Date(assignmentData.endDate) : undefined,
          changeReason: assignmentData.changeReason,
          notes: assignmentData.notes,
        })
        setCustomerName(assignmentData.customer?.name || "N/A")
        setPlans(activePlans)
        setPreviousPlans([...activePlans, ...previousPlan])
        setChangeType(assignmentData.changeType || null)
        setPreviousPlanId(assignmentData.previousPlanId || "")
        setEndDateStr(assignmentData.endDate ? new Date(assignmentData.endDate).toISOString().split("T")[0] : "")
        setChangeReason(assignmentData.changeReason || "")
        setLoading(false)
      })
      .catch((err) => {
        apiFacade.handleApiError(err as Error)
        setError("Error al cargar datos")
        setLoading(false)
      })
  }, [assignmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      setError(
        requiresPreviousPlan && !previousPlanId
          ? "Selecciona el plan anterior para este tipo de cambio."
          : "Completa plan y fecha de inicio."
      )
      return
    }

    setLoading(true)
    setError(null)

    const userData = JSON.parse(localStorage.getItem("user_data") || "{}")
    const changedBy = userData.id || "unknown-user"

    const submitData = {
      planId: formData.planId,
      startDate: formData.startDate,
      status: computedStatus,
      changeType: changeType || null,
      previousPlanId: requiresPreviousPlan && previousPlanId ? previousPlanId : null,
      endDate: endDateStr ? new Date(endDateStr) : null,
      changeReason: changeReason.trim() || null,
      notes: formData.notes?.trim() || null,
      changedBy,
    }

    try {
      await apiFacade.updateCustomerPlan(assignmentId, submitData)
      onAssignmentUpdated()
      onClose()
    } catch (err) {
      apiFacade.handleApiError(err as Error, (newToken) =>
        apiFacade.updateCustomerPlan(assignmentId, submitData, newToken)
      ).catch((finalErr) => {
        setError("Error al actualizar asignación: " + (finalErr as Error).message)
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent aria-describedby="dialog-description">
          <VisuallyHidden>
            <DialogTitle>Editar Asignación</DialogTitle>
            <DialogDescription id="dialog-description">Modifica los datos de la asignación de plan.</DialogDescription>
          </VisuallyHidden>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent aria-describedby="dialog-description" className="sm:max-w-[680px]">
        <VisuallyHidden>
          <DialogTitle>Editar Asignación</DialogTitle>
          <DialogDescription id="dialog-description">Modifica los datos de la asignación de plan.</DialogDescription>
        </VisuallyHidden>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <p className="text-foreground border border-input rounded-md p-2 bg-background">{customerName}</p>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={formData.planId || ""}
                onValueChange={(value) => setFormData({ ...formData, planId: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                  {plans.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No hay planes disponibles</div>
                  )}
                </SelectContent>
              </Select>
              {formData.planId && (
                <p className="text-xs text-muted-foreground">
                  Seleccionado: <span className="font-medium">{plans.find((p) => p.id === formData.planId)?.name ?? "—"}</span>
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate ? formData.startDate.toISOString().split("T")[0] : ""}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Tipo de Cambio</Label>
            <div className="flex flex-wrap gap-2">
              {["UPGRADE", "DOWNGRADE", "LATERAL", "SUSPENSION", "REACTIVATION"].map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={changeType === t ? "default" : "outline"}
                  className="h-9"
                  onClick={() => {
                    setChangeType(t as ChangeType)
                    setPreviousPlanId("")
                    setEndDateStr("")
                  }}
                  disabled={loading}
                >
                  {t}
                </Button>
              ))}
            </div>
            {requiresPreviousPlan && (
              <div className="mt-3 rounded-md border p-3">
                <p className="text-sm font-medium mb-2">Datos para {changeType}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan anterior</Label>
                    <Select
                      value={previousPlanId}
                      onValueChange={(value) => setPreviousPlanId(value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona plan anterior" />
                      </SelectTrigger>
                      <SelectContent>
                        {previousPlans
                          .filter((p) => p.id !== formData.planId)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        {previousPlans.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No hay planes anteriores disponibles</div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Requerido para UPGRADE / DOWNGRADE / LATERAL.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo (opcional)</Label>
                    <Input
                      id="reason"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Ej.: Cambio por mayor velocidad"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
            {changeType === "SUSPENSION" && (
              <div className="mt-3 rounded-md border p-3">
                <p className="text-sm font-medium mb-2">Datos para SUSPENSION</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Fecha fin (opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Si no se define, la suspensión es indefinida.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reasonSusp">Motivo (opcional)</Label>
                    <Input
                      id="reasonSusp"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Ej.: Falta de pago / solicitud del cliente"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
            {changeType === "REACTIVATION" && (
              <div className="mt-3 rounded-md border p-3">
                <p className="text-sm font-medium mb-2">Datos para REACTIVATION</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reasonReact">Motivo (opcional)</Label>
                    <Input
                      id="reasonReact"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Ej.: Cliente regulariza pagos"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                placeholder="Ej. Información adicional sobre la asignación"
                disabled={loading}
                maxLength={500}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="rounded-lg border p-3 text-xs bg-gray-50">
            <p className="font-medium mb-1">Resumen</p>
            <ul className="space-y-1">
              <li><span className="text-muted-foreground">Cliente:</span> {customerName}</li>
              <li><span className="text-muted-foreground">Plan:</span> {plans.find((p) => p.id === formData.planId)?.name ?? "—"}</li>
              <li><span className="text-muted-foreground">Inicio:</span> {formData.startDate ? formData.startDate.toISOString().split("T")[0] : "—"}</li>
              <li><span className="text-muted-foreground">Tipo de cambio:</span> {changeType || "—"}</li>
              <li><span className="text-muted-foreground">Estado resultante:</span> {computedStatus}</li>
              {requiresPreviousPlan && <li><span className="text-muted-foreground">Plan anterior:</span> {previousPlans.find((p) => p.id === previousPlanId)?.name ?? "—"}</li>}
              {endDateStr && <li><span className="text-muted-foreground">Fin:</span> {endDateStr}</li>}
            </ul>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading ? "Actualizando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}