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
            <TableCell data-label="Código">{plan.code}</TableCell>
            <TableCell data-label="Nombre">{plan.name}</TableCell>
            <TableCell data-label="Categoría">{plan.category}</TableCell>
            <TableCell data-label="Precio Mensual">
              {typeof plan.monthlyPrice === "number" && !isNaN(plan.monthlyPrice)
                ? `S/${plan.monthlyPrice.toFixed(2)}`
                : "$0.00"}
            </TableCell>
            <TableCell data-label="Activo">
              <Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Activo" : "Inactivo"}</Badge>
            </TableCell>
            <TableCell data-label="Acciones">
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onEdit(plan.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Editar</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => onView(plan.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Ver</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(plan.id)} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
