// frontend/src/components/forms/UserDetailModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { User } from "@/types/user"
import apiFacade from "@/lib/apiFacade"
import { XIcon } from "lucide-react"

interface UserDetailModalProps {
  userId: string
  onClose: () => void
}

export default function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const [user, setUser] = useState<Partial<User> | null>(null)
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

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle>Detalles del Usuario</DialogTitle>
          <DialogDescription>Cargando los datos del usuario...</DialogDescription>
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          </div>
          <DialogClose asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
  }

  if (!user) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle>Detalles del Usuario</DialogTitle>
          <DialogDescription>No se pudo cargar la información del usuario.</DialogDescription>
          <p className="text-red-500 text-sm">{error || "No se pudo cargar el usuario"}</p>
          <DialogClose asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Detalles del Usuario</DialogTitle>
        <DialogDescription>Información detallada del usuario seleccionado.</DialogDescription>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">ID</Label>
            <p className="text-sm">{user.id}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nombre</Label>
            <p className="text-sm">{user.name || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Correo Electrónico</Label>
            <p className="text-sm">{user.email || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Teléfono</Label>
            <p className="text-sm">{user.phone || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rol</Label>
            <p className="text-sm">{user.role || "No disponible"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estado</Label>
            <p className="text-sm">{user.active ? "Activo" : "Inactivo"}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fecha de Creación</Label>
            <p className="text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "No disponible"}</p>
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}