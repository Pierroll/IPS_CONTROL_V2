// src/components/forms/CreateUserModal.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateUserPayload } from "@/types/user"
import apiFacade from "@/lib/apiFacade"

interface CreateUserModalProps {
  onUserCreated: () => void
}

export default function CreateUserModal({ onUserCreated }: CreateUserModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: "",
    email: "",
    phone: "",
    role: "SELLER", // Rol fijo como Vendedor
    password: "", // Campo para contraseña
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validateForm = () => {
    if (!formData.name || formData.name.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.")
      return false
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Ingresa un email válido.")
      return false
    }
    if (!formData.phone || !/^\+?\d{7,15}$/.test(formData.phone)) {
      setError("Ingresa un teléfono válido (7-15 dígitos).")
      return false
    }
    if (!formData.password || formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    const token = localStorage.getItem("access_token") || ""

    try {
      await apiFacade.createUser(formData, token)
      setOpen(false)
      setFormData({ name: "", email: "", phone: "", role: "SELLER", password: "" })
      onUserCreated()
    } catch (err) {
      await apiFacade.handleApiError(err as any, (newToken) =>
        apiFacade.createUser(formData, newToken)
      )
      setError("Error al crear usuario: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={loading}>
        {loading ? "Creando..." : "Crear Usuario"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <p className="text-sm text-muted-foreground">Vendedor (fijo)</p>
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