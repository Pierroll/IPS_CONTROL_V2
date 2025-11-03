// src/components/forms/CreateAssignmentModal.tsx
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateCustomerPlanPayload } from "@/types/customerPlan"
import apiFacade from "@/lib/apiFacade"
import { Customer } from "@/types/customer"
import { Plan } from "@/types/plans"

// Tipos para changeType/status
type ChangeType =
  | "NEW"
  | "UPGRADE"
  | "DOWNGRADE"
  | "LATERAL"
  | "SUSPENSION"
  | "REACTIVATION"

const CHANGE_TYPES: ChangeType[] = ["NEW", "UPGRADE", "DOWNGRADE", "LATERAL", "SUSPENSION", "REACTIVATION"]

interface CreateAssignmentModalProps {
  onAssignmentCreated: () => void
}

export default function CreateAssignmentModal({ onAssignmentCreated }: CreateAssignmentModalProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])

  // Estado del formulario base
  const [customerId, setCustomerId] = useState("")
  const [planId, setPlanId] = useState("")
  const [startDateStr, setStartDateStr] = useState<string>(() => new Date().toISOString().split("T")[0])

  // “Pestañas” (tipo de cambio) y campos adicionales
  const [changeType, setChangeType] = useState<ChangeType>("NEW")
  const [previousPlanId, setPreviousPlanId] = useState<string>("")
  const [endDateStr, setEndDateStr] = useState<string>("")
  const [changeReason, setChangeReason] = useState<string>("")
  const [notes, setNotes] = useState("")

  // Búsqueda / filtros sin libs extras
  const [customerSearch, setCustomerSearch] = useState("")
  const [planSearch, setPlanSearch] = useState("")
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const customerInputRef = useRef<HTMLInputElement | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return
    const token = localStorage.getItem("access_token") || ""
    Promise.all([apiFacade.getCustomers(token), apiFacade.getPlans(token)])
      .then(([customersData, plansData]) => {
        setCustomers(customersData)
        setPlans(plansData)
      })
      .catch(() => setError("Error al cargar clientes o planes"))
  }, [open])

  // Filtrados
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    const list = q ? customers.filter(c => c.name.toLowerCase().includes(q)) : customers
    return list.slice(0, 50)
  }, [customers, customerSearch])

  const filteredPlans = useMemo(() => {
    const q = planSearch.trim().toLowerCase()
    return q ? plans.filter(p => p.name.toLowerCase().includes(q)) : plans
  }, [plans, planSearch])

  const selectedCustomer = useMemo(() => customers.find(c => c.id === customerId) || null, [customers, customerId])
  const selectedPlan = useMemo(() => plans.find(p => p.id === planId) || null, [plans, planId])

  // Reglas de validación por tipo
  const requiresPreviousPlan = changeType === "UPGRADE" || changeType === "DOWNGRADE" || changeType === "LATERAL"
  const computedStatus: "ACTIVE" | "SUSPENDED" =
    changeType === "SUSPENSION" ? "SUSPENDED" : "ACTIVE"

  const isValidBase = Boolean(customerId && planId && startDateStr)
  const isValid = isValidBase && (!requiresPreviousPlan || Boolean(previousPlanId && previousPlanId !== planId))

  const resetForm = () => {
    setCustomerId("")
    setPlanId("")
    setStartDateStr(new Date().toISOString().split("T")[0])
    setChangeType("NEW")
    setPreviousPlanId("")
    setEndDateStr("")
    setChangeReason("")
    setNotes("")
    setCustomerSearch("")
    setPlanSearch("")
    setShowCustomerResults(false)
    setHighlightIdx(0)
    setError(null)
    setLoading(false)
  }

  const handleCustomerSelect = (c: Customer) => {
    setCustomerId(c.id)
    setCustomerSearch(c.name)
    setShowCustomerResults(false)
    setHighlightIdx(0)
  }

  // Teclado en lista de clientes
  const onCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerResults) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, Math.max(0, filteredCustomers.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const c = filteredCustomers[highlightIdx]
      if (c) handleCustomerSelect(c)
    } else if (e.key === "Escape") {
      setShowCustomerResults(false)
    }
  }

  // Cerrar lista al hacer click afuera
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(e.target as Node)
      ) {
        setShowCustomerResults(false)
      }
    }
    if (showCustomerResults) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showCustomerResults])

  // Envío
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isValid) {
      setError(
        requiresPreviousPlan && !previousPlanId
          ? "Selecciona el plan anterior para este tipo de cambio."
          : "Completa cliente, plan y fecha de inicio."
      )
      return
    }

    setLoading(true)
    const token = localStorage.getItem("access_token") || ""

    // Construir payload evitando strings vacíos
    const payload: CreateCustomerPlanPayload = {
      customerId,
      planId,
      startDate: new Date(startDateStr),
      status: computedStatus, // ACTIVE o SUSPENDED según pestaña
    }

    // changeType: siempre lo mandamos (incluyendo "NEW")
    payload.changeType = changeType

    // previousPlanId solo en UPGRADE/DOWNGRADE/LATERAL
    if (requiresPreviousPlan && previousPlanId) {
      payload.previousPlanId = previousPlanId
    }

    // endDate solo si existe (útil para SUSPENSION programada)
    if (endDateStr) {
      payload.endDate = new Date(endDateStr)
    }

    // changeReason: NO mandar vacío
    const motivo = changeReason.trim()
    if (motivo) {
      payload.changeReason = motivo
    }

    // notes: NO mandar vacío
    const n = notes.trim()
    if (n) {
      payload.notes = n
    }

    try {
      await apiFacade.createCustomerPlan(payload, token)
      resetForm()
      setOpen(false)
      onAssignmentCreated()
    } catch (err) {
      try {
        // @ts-ignore depende de tu firma de handleApiError
        await apiFacade.handleApiError(err, (newToken: string) => apiFacade.createCustomerPlan(payload, newToken))
        resetForm()
        setOpen(false)
        onAssignmentCreated()
      } catch (finalErr: any) {
        setError("Error al crear asignación: " + (finalErr?.message || "desconocido"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button disabled={loading}>{loading ? "Creando..." : "Crear Asignación"}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Nueva Asignación</DialogTitle>
          <p className="text-xs text-muted-foreground">Completa los datos y elige el tipo de cambio en las pestañas.</p>
        </DialogHeader>

        {error && <p className="text-red-500 text-sm -mt-2">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-2 space-y-6">
          {/* Bloque 1: Cliente y Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente con buscador y lista */}
            <div className="space-y-2 relative">
              <Label>Cliente</Label>
              <Input
                ref={customerInputRef}
                placeholder="Buscar por nombre…"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setCustomerId("") // limpiar selección si cambia el texto
                  setShowCustomerResults(true)
                  setHighlightIdx(0)
                }}
                onFocus={() => setShowCustomerResults(true)}
                onKeyDown={onCustomerKeyDown}
                disabled={loading}
              />
              {showCustomerResults && filteredCustomers.length > 0 && (
                <div
                  ref={resultsRef}
                  className="absolute z-50 w-full bg-white border border-gray-300 rounded-md max-h-56 overflow-auto shadow-md mt-1"
                >
                  {filteredCustomers.map((c, idx) => (
                    <div
                      key={c.id}
                      className={`p-2 cursor-pointer ${idx === highlightIdx ? "bg-gray-100" : "hover:bg-gray-100"}`}
                      onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c) }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">Seleccionado: <span className="font-medium">{selectedCustomer.name}</span></p>
              )}
            </div>

            {/* Plan con filtro + select */}
            <div className="space-y-2">
              <Label>Plan</Label>
              <Input
                placeholder="Filtrar planes por nombre…"
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                disabled={loading}
              />
              <Select
                value={planId}
                onValueChange={(value) => setPlanId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                  {filteredPlans.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                  )}
                </SelectContent>
              </Select>
              {selectedPlan && (
                <p className="text-xs text-muted-foreground">Seleccionado: <span className="font-medium">{selectedPlan.name}</span></p>
              )}
            </div>
          </div>

          {/* Bloque 2: Fecha inicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Bloque 3: Pestañas (segmented control) para Change Type */}
          <div className="space-y-3">
            <Label>Tipo de cambio</Label>
            <div className="flex flex-wrap gap-2">
              {CHANGE_TYPES.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={changeType === t ? "default" : "outline"}
                  className="h-9"
                  onClick={() => {
                    setChangeType(t)
                    // reset condicionales al cambiar pestaña
                    setPreviousPlanId("")
                    setEndDateStr("")
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>

            {/* Contenido expandible según pestaña */}
            {requiresPreviousPlan && (
              <div className="mt-3 rounded-md border p-3">
                <p className="text-sm font-medium mb-2">Datos para {changeType}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan anterior</Label>
                    <Select
                      value={previousPlanId}
                      onValueChange={(value) => setPreviousPlanId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona plan anterior" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans
                          .filter(p => p.id !== planId) // no permitir el mismo plan
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Requerido para UPGRADE / DOWNGRADE / LATERAL.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo (opcional)</Label>
                    <Input
                      id="reason"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Ej.: Cambio por mayor velocidad"
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
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notas (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej.: Instalación por la mañana"
                disabled={loading}
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="rounded-lg border p-3 text-xs bg-gray-50">
            <p className="font-medium mb-1">Resumen</p>
            <ul className="space-y-1">
              <li><span className="text-muted-foreground">Cliente:</span> {selectedCustomer?.name ?? "—"}</li>
              <li><span className="text-muted-foreground">Plan:</span> {selectedPlan?.name ?? "—"}</li>
              <li><span className="text-muted-foreground">Inicio:</span> {startDateStr || "—"}</li>
              <li><span className="text-muted-foreground">Tipo de cambio:</span> {changeType}</li>
              <li><span className="text-muted-foreground">Estado resultante:</span> {computedStatus}</li>
              {requiresPreviousPlan && <li><span className="text-muted-foreground">Plan anterior:</span> {plans.find(p => p.id === previousPlanId)?.name ?? "—"}</li>}
              {endDateStr && <li><span className="text-muted-foreground">Fin:</span> {endDateStr}</li>}
            </ul>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
