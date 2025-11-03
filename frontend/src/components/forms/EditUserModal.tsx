// frontend/src/components/forms/EditUserModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "@/types/user"
import apiFacade from "@/lib/apiFacade"

interface EditUserModalProps {
  userId: string
  onUserUpdated: () => void
  onClose: () => void
}

export default function EditUserModal({ userId, onUserUpdated, onClose }: EditUserModalProps) {
  const [user, setUser] = useState<Partial<User> | null>(null)
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const userData = await apiFacade.getUserById(userId)
        setUser(userData)
      } catch (err) {
        setError(`Error al cargar usuario: ${(err as Error).message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      const updateData: Partial<User> = {
        name: user.name,
        phone: user.phone,
        email: user.email,
        active: user.active,
      }
      if (password) {
        updateData.password = password
      }
      await apiFacade.updateUser(userId, updateData)
      onUserUpdated()
      onClose()
    } catch (err) {
      setError(`Error al actualizar usuario: ${(err as Error).message}`)
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>Cargando los datos del usuario...</DialogDescription>
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!user) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>No se pudo cargar la información del usuario.</DialogDescription>
          <p className="text-red-500 text-sm">{error || "No se pudo cargar el usuario"}</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Editar Usuario</DialogTitle>
        <DialogDescription>Modifica los detalles del usuario y guarda los cambios.</DialogDescription>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={user.name || ""}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ""}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar en blanco para no cambiar"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={user.phone || ""}
              onChange={(e) => setUser({ ...user, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="active">Estado</Label>
            <Select
              value={user.active ? "true" : "false"}
              onValueChange={(value) => setUser({ ...user, active: value === "true" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}