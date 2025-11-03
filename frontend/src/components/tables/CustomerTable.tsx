"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"
import { Customer } from "@/types/customer"
import { Badge } from "@/components/ui/badge"

interface CustomerTableProps {
  customers: Customer[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onView: (id: string) => void
}

export default function CustomerTable({ customers, onDelete, onEdit, onView }: CustomerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Distrito</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Estado Asignación</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => {
          const cp = c.customerPlans?.[0] // siempre la última por backend
          const planName = cp?.plan?.name ?? "Sin plan"
          const status = cp?.status ?? "Sin asignación"
          const variant =
            !cp ? "outline" : cp.status === "ACTIVE" ? "default" : cp.status === "SUSPENDED" ? "secondary" : "outline"

        return (
          <TableRow key={c.id}>
            <TableCell>{c.code || "N/A"}</TableCell>
            <TableCell>{c.name || "Sin nombre"}</TableCell>
            <TableCell>{c.email || "N/A"}</TableCell>
            <TableCell>{c.phone || "N/A"}</TableCell>
            <TableCell>{c.district || "N/A"}</TableCell>
            <TableCell>{planName}</TableCell>
            <TableCell>
              <Badge variant={variant as any}>{status}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onView(c.id)} aria-label={`Ver ${c.name}`}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(c.id)} aria-label={`Editar ${c.name}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(c.id)} aria-label={`Eliminar ${c.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table>
  )
}
