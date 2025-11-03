"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TicketStatus, getTicketStatusLabel } from "@/types/ticket"
import apiFacade from "@/lib/apiFacade"
import { toast } from "sonner"

interface ChangeTicketStatusModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  ticketId: string
  currentStatus: TicketStatus
  onStatusChanged: () => void
}

export default function ChangeTicketStatusModal({
  open,
  setOpen,
  ticketId,
  currentStatus,
  onStatusChanged,
}: ChangeTicketStatusModalProps) {
  const [newStatus, setNewStatus] = useState<TicketStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (newStatus === currentStatus) {
      toast.error("El estado debe ser diferente al actual")
      return
    }

    setLoading(true)
    try {
      await apiFacade.updateTicketStatus(ticketId, newStatus)
      toast.success("Estado del ticket actualizado exitosamente")
      setOpen(false)
      onStatusChanged()
    } catch (error) {
      console.error("Error al actualizar estado:", error)
      toast.error("Error al actualizar el estado del ticket")
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = Object.values(TicketStatus).filter(status => status !== currentStatus)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Estado del Ticket</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo estado para este ticket.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentStatus">Estado Actual</Label>
            <div className="p-2 bg-gray-100 rounded-md">
              {getTicketStatusLabel(currentStatus)}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newStatus">Nuevo Estado</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as TicketStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getTicketStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar Estado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
