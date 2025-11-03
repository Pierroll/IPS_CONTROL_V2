// frontend/src/components/tables/PlanTable.tsx
"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"
import { Plan } from "@/types/plan"
import { Badge } from "@/components/ui/badge"

interface PlanTableProps {
  plans: Plan[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onView: (id: string) => void
}

export default function PlanTable({ plans, onDelete, onEdit, onView }: PlanTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Precio Mensual</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell>{plan.code}</TableCell>
            <TableCell>{plan.name}</TableCell>
            <TableCell>{plan.category}</TableCell>
            <TableCell>
              {typeof plan.monthlyPrice === "number" && !isNaN(plan.monthlyPrice)
                ? `S/${plan.monthlyPrice.toFixed(2)}`
                : "$0.00"}
            </TableCell>
            <TableCell>
              <Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Activo" : "Inactivo"}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(plan.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onView(plan.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(plan.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
