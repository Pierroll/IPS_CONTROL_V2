// src/components/tables/TicketTable.tsx
"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Ticket, getTicketCategoryLabel, getPriorityLabel, getTicketStatusLabel } from "@/types/ticket"
import { Edit, Eye, Trash, Settings } from "lucide-react"
import dayjs from "dayjs"

interface TicketTableProps {
  tickets: Ticket[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onView: (id: string) => void
  onStatusChange: (id: string) => void
}

export default function TicketTable({ tickets, onDelete, onEdit, onView, onStatusChange }: TicketTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Técnico</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>{ticket.ticketNumber}</TableCell>
            <TableCell>{ticket.customer?.name || "N/A"}</TableCell>
            <TableCell>{getTicketCategoryLabel(ticket.category)}</TableCell>
            <TableCell>{getTicketStatusLabel(ticket.status)}</TableCell>
            <TableCell>{getPriorityLabel(ticket.priority)}</TableCell>
            <TableCell>{ticket.assignedTechnicianInfo?.name || "No asignado"}</TableCell>
            <TableCell>{dayjs(ticket.createdAt).format("DD/MM/YYYY HH:mm")}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => onView(ticket.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(ticket.id)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onStatusChange(ticket.id)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(ticket.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}