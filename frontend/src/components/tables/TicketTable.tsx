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
          <TableHead className="min-w-[100px]">Número</TableHead>
          <TableHead className="min-w-[150px]">Cliente</TableHead>
          <TableHead className="hidden md:table-cell">Categoría</TableHead>
          <TableHead className="min-w-[100px]">Estado</TableHead>
          <TableHead className="hidden lg:table-cell">Prioridad</TableHead>
          <TableHead className="hidden xl:table-cell">Técnico</TableHead>
          <TableHead className="hidden lg:table-cell">Fecha</TableHead>
          <TableHead className="min-w-[160px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-medium" data-label="Número">{ticket.ticketNumber}</TableCell>
            <TableCell className="min-w-[150px]" data-label="Cliente">{ticket.customer?.name || "N/A"}</TableCell>
            <TableCell className="hidden md:table-cell" data-label="Categoría">{getTicketCategoryLabel(ticket.category)}</TableCell>
            <TableCell data-label="Estado"><span className="text-xs sm:text-sm">{getTicketStatusLabel(ticket.status)}</span></TableCell>
            <TableCell className="hidden lg:table-cell" data-label="Prioridad">{getPriorityLabel(ticket.priority)}</TableCell>
            <TableCell className="hidden xl:table-cell" data-label="Técnico">{ticket.assignedTechnicianInfo?.name || "No asignado"}</TableCell>
            <TableCell className="hidden lg:table-cell text-xs" data-label="Fecha">{dayjs(ticket.createdAt).format("DD/MM/YYYY HH:mm")}</TableCell>
            <TableCell data-label="Acciones">
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => onView(ticket.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Ver</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(ticket.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Editar</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onStatusChange(ticket.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Estado</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(ticket.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Eliminar</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}