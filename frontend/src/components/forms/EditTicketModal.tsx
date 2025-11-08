// src/components/forms/EditTicketModal.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import apiFacade from "@/lib/apiFacade"
import { toast } from "sonner"
import { Ticket } from "@/types/ticket"

interface EditTicketModalProps {
  ticketId: string
  onTicketUpdated: () => void
  onClose: () => void
}

export default function EditTicketModal({ ticketId, onTicketUpdated, onClose }: EditTicketModalProps) {
  const [formData, setFormData] = useState<Partial<Ticket>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const ticket = await apiFacade.getTicketById(ticketId)
        setFormData(ticket)
      } catch (error) {
        toast.error("Error al cargar ticket")
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [ticketId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFacade.updateTicket(ticketId, formData)
      toast.success("Ticket actualizado")
      onTicketUpdated()
      onClose()
    } catch (error) {
      toast.error("Error al actualizar ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Campos similares a Create, pre-llenados con formData */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center">
              <Label htmlFor="title" className="text-sm sm:text-base sm:text-right">
                Título
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title || ""}
                onChange={handleChange}
                className="col-span-1 sm:col-span-3 w-full"
              />
            </div>
            {/* Agrega más campos */}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}