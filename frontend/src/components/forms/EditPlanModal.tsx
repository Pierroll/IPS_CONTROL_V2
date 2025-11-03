// frontend/src/components/forms/EditPlanModal.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plan } from "@/types/plan"
import apiFacade from "@/lib/apiFacade"

interface EditPlanModalProps {
  planId: string
  onPlanUpdated: () => void
  onClose: () => void
}

export default function EditPlanModal({ planId, onPlanUpdated, onClose }: EditPlanModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [mikrotikProfiles, setMikrotikProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFacade.getPlanById(planId).then((data) => {
      setFormData({
        name: data.name,
        description: data.description || "",
        category: data.category || "INTERNET",
        subcategory: data.subcategory || undefined,
        downloadSpeed: data.downloadSpeed || null,
        uploadSpeed: data.uploadSpeed || null,
        dataLimit: data.dataLimit || null,
        monthlyPrice: data.monthlyPrice ? String(data.monthlyPrice) : "0",
        setupFee: data.setupFee || null,
        active: data.active ?? true,
        isPromotional: data.isPromotional ?? false,
        slaLevel: data.slaLevel || "STANDARD",
        supportHours: data.supportHours || "",
        features: data.features || [],
        restrictions: data.restrictions || [],
        targetAudience: data.targetAudience || [],
        mikrotikProfileName: data.mikrotikProfileName || "",
      })
      setLoading(false)
    }).catch((err) => {
      apiFacade.handleApiError(err as Error)
      setError("Error al cargar plan")
      setLoading(false)
    })

    apiFacade.getMikrotikProfiles()
      .then(response => setMikrotikProfiles(response.data))
      .catch(err => {
        setError("Error al cargar perfiles de MikroTik: " + (err as Error).message)
      })
  }, [planId])

  const validateForm = () => {
    if (!formData.name || formData.name.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.")
      return false
    }
    if (formData.description && formData.description.length > 500) {
      setError("La descripción debe tener menos de 500 caracteres.")
      return false
    }
    if (formData.monthlyPrice == null || parseFloat(formData.monthlyPrice) <= 0) {
      setError("El precio mensual debe ser mayor que 0.")
      return false
    }
    if (formData.downloadSpeed && formData.downloadSpeed <= 0) {
      setError("La velocidad de descarga debe ser mayor que 0.")
      return false
    }
    if (formData.uploadSpeed && formData.uploadSpeed <= 0) {
      setError("La velocidad de subida debe ser mayor que 0.")
      return false
    }
    if (formData.dataLimit && formData.dataLimit <= 0) {
      setError("El límite de datos debe ser mayor que 0.")
      return false
    }
    if (formData.setupFee && formData.setupFee < 0) {
      setError("El costo de instalación no puede ser negativo.")
      return false
    }
    if (formData.supportHours && formData.supportHours.length > 50) {
      setError("Las horas de soporte deben tener menos de 50 caracteres.")
      return false
    }
    return true
  }

  const handleArrayInput = useCallback((field: "features" | "restrictions" | "targetAudience", value: string) => {
    const array = value.split(",").map((item) => item.trim()).filter((item) => item)
    setFormData(prev => ({ ...prev, [field]: array }))
  }, [])

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    const submitData: Partial<Plan> = {
      ...formData,
      monthlyPrice: parseFloat(formData.monthlyPrice),
      subcategory: formData.subcategory || null,
      supportHours: formData.supportHours || null,
      description: formData.description || null,
    }
    console.log("Datos enviados al backend:", submitData)

    try {
      await apiFacade.updatePlan(planId, submitData)
      onPlanUpdated()
      onClose()
    } catch (err) {
      apiFacade.handleApiError(err, (newToken) =>
        apiFacade.updatePlan(planId, submitData)
      ).catch((finalErr) => {
        setError("Error al actualizar plan: " + (finalErr as Error).message)
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle>Editar Plan</DialogTitle>
          <DialogDescription id="edit-plan-description">
            Modifica los detalles del plan.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form id="edit-plan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4">
          <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
            <div className="space-y-2 col-span-full">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                disabled={loading}
                maxLength={500}
                className="min-h-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mikrotikProfileName">Perfil de MikroTik</Label>
              <Select
                value={formData.mikrotikProfileName || ""}
                onValueChange={(value) => setFormData({ ...formData, mikrotikProfileName: value })}
                disabled={loading}
              >
                <SelectTrigger id="mikrotikProfileName">
                  <SelectValue placeholder="Selecciona un perfil de MikroTik" />
                </SelectTrigger>
                <SelectContent>
                  {mikrotikProfiles.map((profile) => (
                    <SelectItem key={profile.name} value={profile.name}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category || "INTERNET"}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={loading}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNET">Internet</SelectItem>
                  <SelectItem value="TELEVISION">Televisión</SelectItem>
                  <SelectItem value="TELEPHONE">Teléfono</SelectItem>
                  <SelectItem value="BUNDLE">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoría (Opcional)</Label>
              <Select
                value={formData.subcategory || ""}
                onValueChange={(value) => setFormData({ ...formData, subcategory: value || null })}
                disabled={loading}
              >
                <SelectTrigger id="subcategory">
                  <SelectValue placeholder="Selecciona subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANTENA">Antena</SelectItem>
                  <SelectItem value="FIBRA_OPTICA">Fibra Óptica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="downloadSpeed">Velocidad de Descarga (Mbps, Opcional)</Label>
              <Input
                id="downloadSpeed"
                type="number"
                step="0.01"
                value={formData.downloadSpeed != null ? formData.downloadSpeed : ""}
                onChange={(e) => setFormData({ ...formData, downloadSpeed: e.target.value ? parseFloat(e.target.value) : null })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uploadSpeed">Velocidad de Subida (Mbps, Opcional)</Label>
              <Input
                id="uploadSpeed"
                type="number"
                step="0.01"
                value={formData.uploadSpeed != null ? formData.uploadSpeed : ""}
                onChange={(e) => setFormData({ ...formData, uploadSpeed: e.target.value ? parseFloat(e.target.value) : null })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataLimit">Límite de Datos (GB, Opcional)</Label>
              <Input
                id="dataLimit"
                type="number"
                value={formData.dataLimit != null ? formData.dataLimit : ""}
                onChange={(e) => setFormData({ ...formData, dataLimit: e.target.value ? parseInt(e.target.value) : null })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyPrice">Precio Mensual</Label>
              <Input
                id="monthlyPrice"
                type="number"
                step="0.01"
                value={formData.monthlyPrice}
                onChange={(e) => handleInputChange('monthlyPrice', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setupFee">Costo de Instalación (Opcional)</Label>
              <Input
                id="setupFee"
                type="number"
                step="0.01"
                value={formData.setupFee != null ? formData.setupFee : ""}
                onChange={(e) => setFormData({ ...formData, setupFee: e.target.value ? parseFloat(e.target.value) : null })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">Activo</Label>
              <Switch
                id="active"
                checked={formData.active ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isPromotional">Promocional</Label>
              <Switch
                id="isPromotional"
                checked={formData.isPromotional ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, isPromotional: checked })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slaLevel">Nivel de SLA (Opcional)</Label>
              <Select
                value={formData.slaLevel || "STANDARD"}
                onValueChange={(value) => setFormData({ ...formData, slaLevel: value })}
                disabled={loading}
              >
                <SelectTrigger id="slaLevel">
                  <SelectValue placeholder="Selecciona nivel de SLA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Básico</SelectItem>
                  <SelectItem value="STANDARD">Estándar</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                  <SelectItem value="ENTERPRISE">Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportHours">Horas de Soporte (Opcional)</Label>
              <Input
                id="supportHours"
                value={formData.supportHours || ""}
                onChange={(e) => handleInputChange('supportHours', e.target.value || null)}
                placeholder="Ej. 24/7"
                disabled={loading}
                maxLength={50}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="features">Características (Opcional, separadas por comas)</Label>
              <Textarea
                id="features"
                value={formData.features?.join(", ") || ""}
                onChange={(e) => handleArrayInput("features", e.target.value)}
                placeholder="Ej. WiFi 6, IPTV, Llamadas ilimitadas"
                disabled={loading}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="restrictions">Restricciones (Opcional, separadas por comas)</Label>
              <Textarea
                id="restrictions"
                value={formData.restrictions?.join(", ") || ""}
                onChange={(e) => handleArrayInput("restrictions", e.target.value)}
                placeholder="Ej. Contrato de 12 meses, Solo fibra óptica"
                disabled={loading}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="targetAudience">Público Objetivo (Opcional, separadas por comas)</Label>
              <Textarea
                id="targetAudience"
                value={formData.targetAudience?.join(", ") || ""}
                onChange={(e) => handleArrayInput("targetAudience", e.target.value)}
                placeholder="Ej. Residencial, Negocios pequeños"
                disabled={loading}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </form>
        <DialogFooter className="sticky bottom-0 bg-background py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-plan-form" disabled={loading}>
            {loading ? "Actualizando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
