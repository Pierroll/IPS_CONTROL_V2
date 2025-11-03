// frontend/src/components/forms/PlanDetailModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { XIcon } from "lucide-react"
import { Plan } from "@/types/plan"
import apiFacade from "@/lib/apiFacade"

interface PlanDetailModalProps {
  planId: string
  open: boolean
  onClose: () => void
}

export default function PlanDetailModal({ planId, open, onClose }: PlanDetailModalProps) {
  const [plan, setPlan] = useState<Partial<Plan> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    apiFacade.getPlanById(planId, token).then((data) => {
      console.log("Datos del plan cargados:", data)
      setPlan(data)
      setLoading(false)
    }).catch((err) => {
      setError(`Error al cargar plan: ${(err as Error).message}`)
      setLoading(false)
    })
  }, [planId])

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="plan-detail-description">
          <DialogTitle>Detalles del Plan</DialogTitle>
          <DialogDescription id="plan-detail-description">
            Cargando los datos del plan...
          </DialogDescription>
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          </div>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Cerrar"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
  }

  if (!plan) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="plan-detail-description">
          <DialogTitle>Detalles del Plan</DialogTitle>
          <DialogDescription id="plan-detail-description">
            No se pudo cargar la información del plan.
          </DialogDescription>
          <p className="text-red-500 text-sm">{error || "No se pudo cargar el plan"}</p>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Cerrar"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" aria-describedby="plan-detail-description">
        <DialogTitle>Detalles del Plan</DialogTitle>
        <DialogDescription id="plan-detail-description">
          Información detallada del plan seleccionado.
        </DialogDescription>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Código</Label>
            <p className="text-sm">{plan.code || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nombre</Label>
            <p className="text-sm">{plan.name || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descripción</Label>
            <p className="text-sm">{plan.description || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoría</Label>
            <p className="text-sm">{plan.category || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Subcategoría</Label>
            <p className="text-sm">{plan.subcategory || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Velocidad de Descarga (Mbps)</Label>
            <p className="text-sm">{plan.downloadSpeed != null ? plan.downloadSpeed.toFixed(2) : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Velocidad de Subida (Mbps)</Label>
            <p className="text-sm">{plan.uploadSpeed != null ? plan.uploadSpeed.toFixed(2) : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Límite de Datos (GB)</Label>
            <p className="text-sm">{plan.dataLimit != null ? plan.dataLimit : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Precio Mensual</Label>
            <p className="text-sm">{plan.monthlyPrice != null ? `S/${plan.monthlyPrice.toFixed(2)}` : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Costo de Instalación</Label>
            <p className="text-sm">{plan.setupFee != null ? `S/${plan.setupFee.toFixed(2)}` : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Activo</Label>
            <p className="text-sm">{plan.active ? "Sí" : "No"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Promocional</Label>
            <p className="text-sm">{plan.isPromotional ? "Sí" : "No"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nivel de SLA</Label>
            <p className="text-sm">{plan.slaLevel || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Horas de Soporte</Label>
            <p className="text-sm">{plan.supportHours || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Características</Label>
            <p className="text-sm">{plan.features?.length ? plan.features.join(", ") : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Restricciones</Label>
            <p className="text-sm">{plan.restrictions?.length ? plan.restrictions.join(", ") : "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Público Objetivo</Label>
            <p className="text-sm">{plan.targetAudience?.length ? plan.targetAudience.join(", ") : "No disponible"}</p>
          </div>
{/*           <div className="space-y-2">
            <Label className="text-sm font-medium">Creado Por</Label>
            <p className="text-sm">{plan.createdBy || "No disponible"}</p>
          </div> */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fecha de Creación</Label>
            <p className="text-sm">{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "No disponible"}</p>
          </div>
          <div className="flex justify-end col-span-2">
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
