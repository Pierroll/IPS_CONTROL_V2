// src/components/forms/CreateTechnicianModal.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateTechnicianPayload } from "@/types/technician"
import apiFacade from "@/lib/apiFacade"

interface CreateTechnicianModalProps {
  onTechnicianCreated: () => void
}

export default function CreateTechnicianModal({ onTechnicianCreated }: CreateTechnicianModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<CreateTechnicianPayload>({
    name: "",
    phone: "",
    district: "",
    email: null,
    documentNumber: null,
    userId: null,
    specialties: {},
    certifications: {},
    experience: undefined,
    hourlyRate: undefined,
    workSchedule: {},
    isExternal: true,
    active: true,
    province: "Tocache",
    department: "San Martín",
    createdBy: undefined,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const token = localStorage.getItem("access_token") || ""

    try {
      await apiFacade.createTechnician(formData, token)
      setOpen(false)
      onTechnicianCreated()
    } catch (err) {
      await apiFacade.handleApiError(err as any, (newToken) =>
        apiFacade.createTechnician(formData, newToken)
      )
      setError("Error al crear técnico: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={loading}>
        {loading ? "Creando..." : "Crear Técnico"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Técnico</DialogTitle>
          </DialogHeader>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Distrito</Label>
              <Input id="district" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}