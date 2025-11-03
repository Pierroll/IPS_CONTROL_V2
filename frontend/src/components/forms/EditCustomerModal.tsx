"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import apiFacade from "@/lib/apiFacade"
import { Customer } from "@/types/customer"
import { CustomerPlan, CreateCustomerPlanPayload } from "@/types/customerPlan"
import { Plan } from "@/types/plan"

// Helpers
const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "")
const sameDay = (a?: Date | null, b?: Date | null) => ymd(a) === ymd(b)
const safeTrim = (v?: string | null) => (v ?? "").trim()

interface EditCustomerModalProps {
  customerId: string
  onCustomerUpdated: () => void
  onClose: () => void
}

export default function EditCustomerModal({
  customerId,
  onCustomerUpdated,
  onClose,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    district: "",
    customerType: "INDIVIDUAL",
    priority: "MEDIA",
    status: "ACTIVE",
  })

  const [plans, setPlans] = useState<Plan[]>([])
  const [customerPlanId, setCustomerPlanId] = useState<string | null>(null)

  // Estado editable (NUEVA asignación)
  const [customerPlan, setCustomerPlan] = useState<Partial<CustomerPlan>>({
    status: "ACTIVE",
    startDate: new Date(),
    planId: "",
  })

  // Estado “Plan actual” (solo lectura visual)
  const [currentPlanView, setCurrentPlanView] = useState<{
    planId?: string | null
    planName?: string | null
    status?: CustomerPlan["status"] | null
    startDate?: Date | null
    endDate?: Date | null
  }>({})

  // Snapshots para detectar cambios
  const [initialPlanId, setInitialPlanId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<CustomerPlan["status"] | null>(null)
  const [initialStartDate, setInitialStartDate] = useState<Date | null>(null)
  const [initialEndDate, setInitialEndDate] = useState<Date | null>(null)
  const [initialChangeReason, setInitialChangeReason] = useState<string>("")
  const [initialNotes, setInitialNotes] = useState<string>("")

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Para el confirm: resumen de cambios
  const changeSummary = useMemo(() => {
    const lines: string[] = []
    if (!customerPlanId && customerPlan.planId) {
      lines.push("Se creará una nueva asignación de plan.")
    }
    if (String(customerPlan.planId || "") !== String(initialPlanId || "")) {
      const oldName = plans.find(p => String(p.id) === String(initialPlanId))?.name || currentPlanView.planName || "Plan previo"
      const newName = plans.find(p => String(p.id) === String(customerPlan.planId))?.name || "Plan seleccionado"
      lines.push(`Plan: ${oldName} → ${newName}`)
    }
    if ((customerPlan.status || null) !== (initialStatus || null)) {
      lines.push(`Estado: ${initialStatus ?? "—"} → ${customerPlan.status ?? "—"}`)
    }
    if (!sameDay(customerPlan.startDate || null, initialStartDate)) {
      lines.push(`Inicio: ${ymd(initialStartDate)} → ${ymd(customerPlan.startDate)}`)
    }
    if (!sameDay(customerPlan.endDate || null, initialEndDate)) {
      lines.push(`Fin: ${ymd(initialEndDate)} → ${ymd(customerPlan.endDate ?? null)}`)
    }
    const r1 = safeTrim(customerPlan.changeReason)
    if (r1 !== initialChangeReason) {
      lines.push(`Razón del cambio: ${initialChangeReason || "—"} → ${r1 || "—"}`)
    }
    const n1 = safeTrim(customerPlan.notes)
    if (n1 !== initialNotes) {
      lines.push(`Notas: ${initialNotes || "—"} → ${n1 || "—"}`)
    }
    return lines
  }, [
    customerPlanId,
    customerPlan.planId,
    customerPlan.status,
    customerPlan.startDate,
    customerPlan.endDate,
    customerPlan.changeReason,
    customerPlan.notes,
    initialPlanId,
    initialStatus,
    initialStartDate,
    initialEndDate,
    initialChangeReason,
    initialNotes,
    plans,
    currentPlanView.planName,
  ])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Planes activos
        const allPlans = await apiFacade.getPlans()
        const activePlans = allPlans.filter((p: any) => !p.deletedAt && (p as any).active !== false)
        setPlans(activePlans)

        // 2) Cliente
        const customer = await apiFacade.getCustomerById(customerId)
        setFormData({
          name: customer.name,
          businessName: customer.businessName || null,
          email: customer.email || null,
          phone: customer.phone || "",
          alternativePhone: customer.alternativePhone || null,
          address: customer.address || null,
          district: customer.district || "",
          province: customer.province || null,
          department: customer.department || null,
          documentNumber: customer.documentNumber || null,
          documentType: customer.documentType || null,
          customerType: customer.customerType || "INDIVIDUAL",
          serviceType: customer.serviceType || null,
          contractDate: customer.contractDate || null,
          creditLimit: customer.creditLimit || null,
          notes: customer.notes || null,
          tags: customer.tags || [],
          priority: customer.priority || "MEDIA",
          source: customer.source || null,
          assignedSeller: customer.assignedSeller || null,
          technicianId: customer.technicianId || null,
          status: customer.status || "ACTIVE",
        })

        // 3) Intentar leer asignación ACTIVA desde el payload del cliente
        let activeAssignment = customer.customerPlans?.find((cp: any) => cp.status === "ACTIVE")
        let planIdFromCustomer = activeAssignment
          ? String(activeAssignment.planId ?? activeAssignment.plan?.id ?? "")
          : ""

        // 4) Si no hay planId, pedirlo al backend con filtros
        if (!planIdFromCustomer) {
          const activeCps = await apiFacade.getCustomerPlansFiltered({ customerId, status: "ACTIVE" })
          if (activeCps && activeCps.length) {
            activeAssignment = [...activeCps].sort(
              (a: any, b: any) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0)
            )[0] as any
            planIdFromCustomer = String(activeAssignment.planId ?? activeAssignment.plan?.id ?? "")
          }
        }

        if (activeAssignment && planIdFromCustomer) {
          const start = activeAssignment.startDate ? new Date(activeAssignment.startDate) : new Date()
          const end = activeAssignment.endDate ? new Date(activeAssignment.endDate) : null

          // Plan actual (solo lectura)
          setCurrentPlanView({
            planId: planIdFromCustomer,
            planName: activeAssignment.plan?.name || "Plan actual",
            status: activeAssignment.status,
            startDate: start,
            endDate: end,
          })

          // Setear como propuesta inicial del form de “Nuevo plan”
          setCustomerPlan({
            id: activeAssignment.id,
            planId: planIdFromCustomer,
            status: activeAssignment.status,
            startDate: start,
            endDate: end,
            changeType: activeAssignment.changeType || null,
            changeReason: activeAssignment.changeReason || null,
            notes: activeAssignment.notes || null,
          })
          setCustomerPlanId(activeAssignment.id)

          // snapshots
          setInitialPlanId(planIdFromCustomer)
          setInitialStatus(activeAssignment.status || null)
          setInitialStartDate(start)
          setInitialEndDate(end)
          setInitialChangeReason(safeTrim(activeAssignment.changeReason))
          setInitialNotes(safeTrim(activeAssignment.notes))

          // Inyectar "ghost" si el plan actual no está activo (para poder verlo preseleccionado)
          const existsInActive = activePlans.some((p) => String(p.id) === String(planIdFromCustomer))
          if (!existsInActive) {
            const ghost = {
              id: planIdFromCustomer,
              name: activeAssignment.plan?.name || "Plan actual (inactivo)",
              monthlyPrice: Number(activeAssignment.plan?.monthlyPrice ?? 0),
            } as unknown as Plan
            setPlans((prev) => [ghost, ...prev])
          }
        } else {
          // Cliente sin asignación
          setCurrentPlanView({})
          setCustomerPlan({
            status: "ACTIVE",
            startDate: new Date(),
            planId: "",
          })
          setCustomerPlanId(null)
          setInitialPlanId(null)
          setInitialStatus(null)
          setInitialStartDate(null)
          setInitialEndDate(null)
          setInitialChangeReason("")
          setInitialNotes("")
        }
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar datos del cliente o planes. Intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  const validateForm = () => {
    if (!formData.name || formData.name.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.")
      return false
    }
    if (formData.phone && !/^\+?\d{7,15}$/.test(formData.phone)) {
      setError("Ingresa un teléfono válido (7-15 dígitos).")
      return false
    }
    if (formData.alternativePhone && !/^\+?\d{7,15}$/.test(formData.alternativePhone)) {
      setError("Ingresa un teléfono alternativo válido (7-15 dígitos).")
      return false
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Ingresa un email válido.")
      return false
    }
    if (formData.district && formData.district.length < 3) {
      setError("El distrito debe tener al menos 3 caracteres.")
      return false
    }
    if (formData.documentNumber && !/^\d{8}$/.test(formData.documentNumber)) {
      setError("El DNI debe tener 8 dígitos numéricos.")
      return false
    }
    if (formData.notes && formData.notes.length > 500) {
      setError("La referencia debe tener menos de 500 caracteres.")
      return false
    }
    if (customerPlan.planId) {
      if (!customerPlan.status) {
        setError("Debe seleccionar un estado para el plan.")
        return false
      }
      if (!customerPlan.startDate) {
        setError("Debe seleccionar una fecha de inicio para el plan.")
        return false
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (customerPlan.startDate > today) {
        setError("La fecha de inicio no puede ser futura.")
        return false
      }
      if (customerPlan.endDate && customerPlan.endDate <= customerPlan.startDate) {
        setError("La fecha de fin debe ser posterior a la fecha de inicio.")
        return false
      }
      if (customerPlan.changeReason && customerPlan.changeReason.length > 500) {
        setError("La razón del cambio debe tener menos de 500 caracteres.")
        return false
      }
      if (customerPlan.notes && customerPlan.notes.length > 500) {
        setError("Las notas del plan deben tener menos de 500 caracteres.")
        return false
      }
    }
    return true
  }

  const hasPlanChanges = () => {
    if (!customerPlanId) return !!customerPlan.planId
    const planChanged = String(customerPlan.planId || "") !== String(initialPlanId || "")
    const statusChanged = (customerPlan.status || null) !== (initialStatus || null)
    const startChanged = !sameDay(customerPlan.startDate || null, initialStartDate)
    const endChanged = !sameDay(customerPlan.endDate || null, initialEndDate)
    const reasonChanged = safeTrim(customerPlan.changeReason) !== initialChangeReason
    const notesChanged = safeTrim(customerPlan.notes) !== initialNotes
    return planChanged || statusChanged || startChanged || endChanged || reasonChanged || notesChanged
  }

  const computeChangeType = (): CustomerPlan["changeType"] | null => {
    if (!customerPlan.planId || !customerPlan.status) return null
    if (!customerPlanId || !initialPlanId) return "NEW"
    if (initialStatus === "ACTIVE" && customerPlan.status === "SUSPENDED") return "SUSPENSION"
    if (initialStatus === "SUSPENDED" && customerPlan.status === "ACTIVE") return "REACTIVATION"
    if (customerPlan.planId !== initialPlanId) {
      const oldPlan = plans.find((p) => String(p.id) === String(initialPlanId))
      const newPlan = plans.find((p) => String(p.id) === String(customerPlan.planId))
      if (oldPlan && newPlan) {
        if (newPlan.monthlyPrice > oldPlan.monthlyPrice) return "UPGRADE"
        if (newPlan.monthlyPrice < oldPlan.monthlyPrice) return "DOWNGRADE"
        return "LATERAL"
      }
    }
    return null
  }

  // 1) Primer submit: valida y, si hay cambios de plan, abre confirm
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    // si hay cambios en la asignación, pedimos confirmación
    if (hasPlanChanges()) {
      setConfirmOpen(true)
      return
    }

    // si NO hay cambios de plan, actualizamos cliente directo
    await updateCustomerOnly()
  }

    // 2) Confirmación: ejecutar updates
  // frontend/src/components/forms/EditCustomerModal.tsx
// frontend/src/components/forms/EditCustomerModal.tsx
// frontend/src/components/forms/EditCustomerModal.tsx
// frontend/src/components/forms/EditCustomerModal.tsx
const handleConfirm = async () => {
  try {
    await updateCustomerOnly();

    if (customerPlan.planId && customerPlan.status && customerPlan.startDate) {
      const changeType = computeChangeType();
      console.log('customerPlanId:', customerPlanId); // Log para depurar
      if (customerPlanId) {
        // UPDATE existente
        const updatePayload = {
          planId: String(customerPlan.planId),
          status: customerPlan.status,
          startDate: customerPlan.startDate instanceof Date
            ? customerPlan.startDate.toISOString()
            : customerPlan.startDate,
          endDate: customerPlan.endDate instanceof Date
            ? customerPlan.endDate.toISOString()
            : customerPlan.endDate || null,
          changeType: changeType || null,
          changeReason: safeTrim(customerPlan.changeReason) || null,
          notes: safeTrim(customerPlan.notes) || null,
          // No enviar changedBy; el backend lo maneja
        };

        console.log('📤 Enviando UPDATE:', JSON.stringify(updatePayload, null, 2));
        await apiFacade.updateCustomerPlan(customerPlanId, updatePayload);
      } else {
        // CREATE nuevo
        const createPayload: CreateCustomerPlanPayload = {
          customerId,
          planId: String(customerPlan.planId),
          status: customerPlan.status,
          startDate: customerPlan.startDate instanceof Date
            ? customerPlan.startDate.toISOString()
            : customerPlan.startDate,
          endDate: customerPlan.endDate instanceof Date
            ? customerPlan.endDate.toISOString()
            : customerPlan.endDate || undefined,
          changeType: changeType || undefined,
          changeReason: safeTrim(customerPlan.changeReason) || undefined,
          notes: safeTrim(customerPlan.notes) || undefined,
          // No enviar changedBy
        };

        console.log('📤 Enviando CREATE:', JSON.stringify(createPayload, null, 2));
        await apiFacade.createCustomerPlan(createPayload);
      }
    }

    setConfirmOpen(false);
    onClose();
    onCustomerUpdated();
  } catch (err: any) {
    console.error("❌ Error al actualizar:", err);
    let msg = "Error al actualizar cliente o asignación.";
    if (err?.details) {
      msg = `Errores de validación:\n${err.details.map((d: any) => `- ${d.field}: ${d.message}`).join('\n')}`;
    } else if (err?.message) {
      msg = err.message;
    }
    setError(msg);
    setConfirmOpen(false);
  }
}

  const updateCustomerOnly = async () => {
    const { status: _omitStatus, ...customerUpdatePayload } = formData
    await apiFacade.updateCustomer(customerId, customerUpdatePayload)
    // si sólo era update de cliente, cerramos modal y avisamos
    onClose()
    onCustomerUpdated()
  }

  const handleDniChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dni = e.target.value
    setFormData((prev) => ({ ...prev, documentNumber: dni }))
    setError(null)

    if (dni.length === 8) {
      if (!/^\d{8}$/.test(dni)) {
        setError("El DNI debe contener solo 8 dígitos numéricos.")
        return
      }
      try {
        const res = await fetch("/api/dni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni }),
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          if (res.status === 400) setError(errorData.error || "DNI inválido. Verifica el número.")
          else if (res.status === 429) setError("Demasiadas solicitudes. Intenta de nuevo más tarde.")
          else if (res.status === 500) setError("Error en el servidor al consultar el DNI. Intenta de nuevo.")
          else setError(`Error ${res.status}: No se pudo consultar el DNI.`)
          return
        }
        const data = await res.json()
        if (data.nombre_completo) {
          setFormData((prev) => ({ ...prev, name: data.nombre_completo }))
          setError(null)
        } else {
          setError(data.error || "No se encontró información para este DNI.")
        }
      } catch (err) {
        console.error("Error en consulta de DNI:", err)
        setError("Error al consultar el DNI. Verifica tu conexión o intenta de nuevo.")
      }
    }
  }

  if (loading) return null

  return (
    <>
      {/* MODAL PRINCIPAL */}
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[980px] p-0" aria-describedby="edit-customer-description">
          <div className="px-6 pt-6">
            <DialogHeader className="space-y-1">
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription id="edit-customer-description">
                Modifica los datos del cliente y su asignación de plan.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </div>

          <div className="px-6 pb-4 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda: Datos del cliente */}
                <div className="space-y-5">
                  <h3 className="text-sm font-medium text-muted-foreground">Datos del cliente</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="documentNumber">DNI (Opcional)</Label>
                      <Input
                        id="documentNumber"
                        value={formData.documentNumber || ""}
                        onChange={handleDniChange}
                        maxLength={8}
                        placeholder="12345678"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alternativePhone">Teléfono Alternativo (Opcional)</Label>
                      <Input
                        id="alternativePhone"
                        value={formData.alternativePhone || ""}
                        onChange={(e) => setFormData({ ...formData, alternativePhone: e.target.value || null })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas (Opcional)</Label>
                      <Input
                        id="notes"
                        value={formData.notes || ""}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                        maxLength={500}
                        placeholder="Ej. Cerca de la plaza principal"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="address">Dirección (Opcional)</Label>
                      <Input
                        id="address"
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value || null })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">Distrito</Label>
                      <Input
                        id="district"
                        value={formData.district || ""}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Provincia (Opcional)</Label>
                      <Input
                        id="province"
                        value={formData.province || ""}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value || null })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Departamento (Opcional)</Label>
                      <Input
                        id="department"
                        value={formData.department || ""}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value || null })}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerType">Tipo de Cliente</Label>
                      <Select
                        value={formData.customerType || "INDIVIDUAL"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, customerType: value as Customer["customerType"] })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger id="customerType">
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                          <SelectItem value="BUSINESS">Negocio</SelectItem>
                          <SelectItem value="CORPORATION">Corporación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Si tu backend no acepta status en updateCustomer, lo mantenemos visual pero no lo enviamos */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Estado del Cliente</Label>
                      <Select
                        value={formData.status || "ACTIVE"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value as Customer["status"] })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Activo</SelectItem>
                          <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                          <SelectItem value="INACTIVE">Inactivo</SelectItem>
                          <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Columna derecha: Asignación de plan */}
                <div className="space-y-5">
                  <h3 className="text-sm font-medium text-muted-foreground">Asignación de plan</h3>

                  {/* --- Plan actual (solo lectura) --- */}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Plan actual</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Plan:</span>{" "}
                        <span className="font-medium">{currentPlanView.planName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estado:</span>{" "}
                        <span className="font-medium">{currentPlanView.status || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inicio:</span>{" "}
                        <span className="font-medium">{ymd(currentPlanView.startDate || null) || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fin:</span>{" "}
                        <span className="font-medium">{ymd(currentPlanView.endDate || null) || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* --- Nuevo plan (editable) --- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plan">Nuevo plan</Label>
                      <Select
                        value={customerPlan.planId || ""}
                        onValueChange={(value) =>
                          setCustomerPlan((prev) => ({
                            ...prev,
                            planId: value,
                            startDate: prev.startDate || new Date(),
                          }))
                        }
                        disabled={loading || plans.length === 0}
                      >
                        <SelectTrigger id="plan">
                          <SelectValue placeholder={plans.length ? "Seleccione un plan" : "Cargando planes..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={String(plan.id)} value={String(plan.id)}>
                              {plan.name}
                              {typeof (plan as any).monthlyPrice === "number"
                                ? ` (S/ ${(plan as any).monthlyPrice.toFixed(2)})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planStatus">Estado</Label>
                      <Select
                        value={customerPlan.status || ""}
                        onValueChange={(value) =>
                          setCustomerPlan((prev) => ({
                            ...prev,
                            status: value as CustomerPlan["status"],
                            startDate: prev.startDate || new Date(),
                          }))
                        }
                        disabled={loading || !customerPlan.planId}
                      >
                        <SelectTrigger id="planStatus">
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Activo</SelectItem>
                          <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                          <SelectItem value="INACTIVE">Inactivo</SelectItem>
                          <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">Inicio</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={ymd(customerPlan.startDate)}
                        onChange={(e) =>
                          setCustomerPlan((prev) => ({
                            ...prev,
                            startDate: e.target.value ? new Date(e.target.value) : new Date(),
                          }))
                        }
                        disabled={loading || !customerPlan.planId}
                        required={!!customerPlan.planId}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Fin (Opcional)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={ymd(customerPlan.endDate ?? null)}
                        onChange={(e) =>
                          setCustomerPlan((prev) => ({
                            ...prev,
                            endDate: e.target.value ? new Date(e.target.value) : null,
                          }))
                        }
                        disabled={loading || !customerPlan.planId}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="changeReason">Razón del cambio (Opcional)</Label>
                      <Input
                        id="changeReason"
                        value={customerPlan.changeReason || ""}
                        onChange={(e) =>
                          setCustomerPlan((prev) => ({
                            ...prev,
                            changeReason: e.target.value || null,
                          }))
                        }
                        maxLength={500}
                        placeholder="Ej. Solicitud del cliente"
                        disabled={loading || !customerPlan.planId}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="planNotes">Notas (Opcional)</Label>
                      <Input
                        id="planNotes"
                        value={customerPlan.notes || ""}
                        onChange={(e) =>
                          setCustomerPlan((prev) => ({
                            ...prev,
                            notes: e.target.value || null,
                          }))
                        }
                        maxLength={500}
                        placeholder="Ej. Instalación por la mañana"
                        disabled={loading || !customerPlan.planId}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-4" />

              {/* Botonera */}
              <div className="sticky bottom-0 left-0 right-0 bg-background border-t px-6 py-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Actualizando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMACIÓN */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent aria-describedby="confirm-description">
          <DialogHeader>
            <DialogTitle>Confirmar cambios de asignación</DialogTitle>
            <DialogDescription id="confirm-description">
              Revisa y confirma los cambios en la asignación del plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {changeSummary.length ? (
              <ul className="list-disc pl-5">
                {changeSummary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>No se detectaron cambios en la asignación.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Volver
            </Button>
            <Button onClick={handleConfirm}>Confirmar y guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
