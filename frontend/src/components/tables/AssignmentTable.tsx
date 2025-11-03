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
              <TableCell>{a.customer?.name || "N/A"}</TableCell>
              <TableCell>{a.plan?.name || "N/A"}</TableCell>

              <TableCell>
                <Badge variant={a.status === "ACTIVE" ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
              </TableCell>

              <TableCell>{fmtDate(a.startDate)}</TableCell>
              <TableCell>{changeTypeLabel}</TableCell>

              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(a.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onView(a.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(a.id)}>
                    <Trash2 className="h-4 w-4" />
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
