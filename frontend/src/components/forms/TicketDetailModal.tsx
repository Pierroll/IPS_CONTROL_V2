// src/components/forms/TicketDetailModal.tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import apiFacade from "@/lib/apiFacade"
import { Ticket } from "@/types/ticket"
import { toast } from "sonner"

interface TicketDetailModalProps {
  ticketId: string
  open: boolean
  onClose: () => void
}

export default function TicketDetailModal({ ticketId, open, onClose }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      const fetchTicket = async () => {
        try {
          const data = await apiFacade.getTicketById(ticketId)
          setTicket(data)
        } catch (error) {
          toast.error("Error al cargar detalles del ticket")
        } finally {
          setLoading(false)
        }
      }
      fetchTicket()
    }
  }, [open, ticketId])

  if (loading) return <p>Cargando...</p>

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detalles del Ticket {ticket?.ticketNumber}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p><strong>Título:</strong> {ticket?.title}</p>
          <p><strong>Descripción:</strong> {ticket?.description}</p>
          <p><strong>Categoría:</strong> {ticket?.category}</p>
          <p><strong>Estado:</strong> {ticket?.status}</p>
          {/* Agrega más detalles, historial, adjuntos, etc. */}
        </div>
      </DialogContent>
    </Dialog>
  )
}