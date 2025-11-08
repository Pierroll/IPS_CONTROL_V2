"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"
import { CustomerPlan } from "@/types/customerPlan"
import { Badge } from "@/components/ui/badge"
import { CHANGE_TYPE_LABEL, ASSIGNMENT_STATUS_LABEL } from "@/lib/labels"

// Helper seguro para fechas (acepta string o Date)
const fmtDate = (value?: string | Date | null) => {
  if (!value) return "N/A"
  const d = typeof value === "string" ? new Date(value) : value
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("es-PE")
}

interface AssignmentTableProps {
  assignments: CustomerPlan[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onView: (id: string) => void
}

export default function AssignmentTable({ assignments, onDelete, onEdit, onView }: AssignmentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha Inicio</TableHead>
          <TableHead>Tipo de Cambio</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => {
          const statusLabel =
            ASSIGNMENT_STATUS_LABEL[a.status as keyof typeof ASSIGNMENT_STATUS_LABEL] ?? a.status

          const changeTypeLabel = a.changeType
            ? (CHANGE_TYPE_LABEL[a.changeType as keyof typeof CHANGE_TYPE_LABEL] ?? a.changeType)
            : "N/A"

          return (
            <TableRow key={a.id}>
              <TableCell data-label="Cliente">{a.customer?.name || "N/A"}</TableCell>
              <TableCell data-label="Plan">{a.plan?.name || "N/A"}</TableCell>

              <TableCell data-label="Estado">
                <Badge variant={a.status === "ACTIVE" ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
              </TableCell>

              <TableCell data-label="Fecha Inicio">{fmtDate(a.startDate)}</TableCell>
              <TableCell data-label="Tipo de Cambio">{changeTypeLabel}</TableCell>

              <TableCell data-label="Acciones">
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => onEdit(a.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Editar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onView(a.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Ver</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(a.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Eliminar</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
