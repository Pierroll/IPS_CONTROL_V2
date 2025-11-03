// frontend/src/components/forms/EditTechnicianModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { XIcon } from "lucide-react"
import { Technician } from "@/types/technician"
import apiFacade from "@/lib/apiFacade"

interface EditTechnicianModalProps {
  technicianId: string
  onTechnicianUpdated: () => void
  onClose: () => void
}

export default function EditTechnicianModal({ technicianId, onTechnicianUpdated, onClose }: EditTechnicianModalProps) {
  const [formData, setFormData] = useState<Partial<Technician>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("No se encontró el token de autenticación")
      setLoading(false)
      return
    }
    apiFacade.getTechnicianById(technicianId, token).then((data) => {
      console.log("Datos del técnico cargados:", data)
      setFormData(data)
      setLoading(false)
    }).catch((err) => {
      apiFacade.handleApiError(err as Error)
      setError("Error al cargar técnico: " + (err as Error).message)
      setLoading(false)
    })
  }, [technicianId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validar campos requeridos
    if (!formData.name || !formData.phone || !formData.district) {
      setError("Por favor, completa todos los campos requeridos")
      setLoading(false)
      return
    }

    const token = localStorage.getItem("access_token") || ""
    if (!token) {
      setError("No se encontró el token de autenticación")
      setLoading(false)
      return
    }

    const updateData: Partial<Technician> = {
      name: formData.name?.trim(),
      phone: formData.phone?.trim(),
      district: formData.district?.trim(),
    }

    console.log("Datos enviados a PUT /api/technicians:", updateData)

    try {
      await apiFacade.updateTechnician(technicianId, updateData, token)
      onTechnicianUpdated()
      onClose()
    } catch (err) {
      console.error("Error en handleSubmit:", err)
      await apiFacade.handleApiError(err as any, (newToken) =>
        apiFacade.updateTechnician(technicianId, updateData, newToken)
      )
      setError("Error al actualizar técnico: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Editar Técnico</DialogTitle>
          <DialogDescription>Cargando los datos del técnico...</DialogDescription>
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          </div>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>Editar Técnico</DialogTitle>
        <DialogDescription>Modifica los detalles del técnico y guarda los cambios.</DialogDescription>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">Distrito</Label>
            <Input
              id="district"
              value={formData.district || ""}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}