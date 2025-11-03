// frontend/src/components/forms/CreatePlanModal.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { CreatePlanPayload } from "@/types/plan"
import apiFacade from "@/lib/apiFacade"

interface CreatePlanModalProps {
  onPlanCreated: () => void
}

export default function CreatePlanModal({ onPlanCreated }: CreatePlanModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    category: "INTERNET",
    subcategory: undefined,
    downloadSpeed: null,
    uploadSpeed: null,
    dataLimit: null,
    monthlyPrice: "0",
    setupFee: null,
    active: true,
    isPromotional: false,
    slaLevel: "STANDARD",
    supportHours: "",
    features: [],
    restrictions: [],
    targetAudience: [],
    mikrotikProfileName: "",
  })
  const [mikrotikProfiles, setMikrotikProfiles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const token = localStorage.getItem("access_token") || ""
      apiFacade.getMikrotikProfiles(token)
        .then(response => setMikrotikProfiles(response.data))
        .catch(err => {
          setError("Error al cargar perfiles de MikroTik: " + (err as Error).message)
        })
    }
  }, [open])

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

  const handleArrayInput = (field: "features" | "restrictions" | "targetAudience", value: string) => {
    const array = value.split(",").map((item) => item.trim()).filter((item) => item)
    setFormData({ ...formData, [field]: array })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    const token = localStorage.getItem("access_token") || ""

    const submitData: CreatePlanPayload = {
      ...formData,
      monthlyPrice: parseFloat(formData.monthlyPrice),
      subcategory: formData.subcategory || null,
    }
    console.log("Datos enviados al backend:", submitData)

    try {
      await apiFacade.createPlan(submitData, token)
      setOpen(false)
      onPlanCreated()
    } catch (err) {
      apiFacade.handleApiError(err, (newToken) =>
        apiFacade.createPlan(submitData, newToken)
      ).catch((finalErr) => {
        setError("Error al crear plan: " + (finalErr as Error).message)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={loading}>
        {loading ? "Creando..." : "Crear Plan"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle>Crear Nuevo Plan</DialogTitle>
            <DialogDescription id="create-plan-description">
              Ingresa los detalles del nuevo plan.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4">
            <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
              <div className="space-y-2 col-span-full">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 col-span-full">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                  disabled={loading}
                  maxLength={500}
                  className="min-h-[100px]"
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
                  value={formData.category}
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
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
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
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPromotional">Promocional</Label>
                <Switch
                  id="isPromotional"
                  checked={formData.isPromotional}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPromotional: checked })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaLevel">Nivel de SLA (Opcional)</Label>
                <Select
                  value={formData.slaLevel}
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
                  value={formData.supportHours}
                  onChange={(e) => setFormData({ ...formData, supportHours: e.target.value || null })}
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
<DialogFooter
  className="sticky bottom-0 bg-background py-4 border-t col-span-full flex flex-row justify-end gap-2"
>
  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
    Cancelar
  </Button>
  <Button type="submit" disabled={loading}>
    {loading ? "Creando..." : "Crear"}
  </Button>
</DialogFooter>

            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
