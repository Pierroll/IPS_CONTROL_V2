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
          <TableHead className="min-w-[80px]">Código</TableHead>
          <TableHead className="min-w-[120px]">Nombre</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead className="whitespace-nowrap">Teléfono</TableHead>
          <TableHead className="hidden lg:table-cell">Distrito</TableHead>
          <TableHead className="min-w-[100px]">Plan</TableHead>
          <TableHead className="min-w-[120px]">Estado</TableHead>
          <TableHead className="min-w-[140px]">Acciones</TableHead>
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
            <TableCell className="font-medium" data-label="Código">{c.code || "N/A"}</TableCell>
            <TableCell className="min-w-[120px]" data-label="Nombre">{c.name || "Sin nombre"}</TableCell>
            <TableCell className="hidden md:table-cell" data-label="Email">{c.email || "N/A"}</TableCell>
            <TableCell className="whitespace-nowrap" data-label="Teléfono">{c.phone || "N/A"}</TableCell>
            <TableCell className="hidden lg:table-cell" data-label="Distrito">{c.district || "N/A"}</TableCell>
            <TableCell className="min-w-[100px]" data-label="Plan">{planName}</TableCell>
            <TableCell data-label="Estado">
              <Badge variant={variant as any}>{status}</Badge>
            </TableCell>
            <TableCell data-label="Acciones">
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onView(c.id)} aria-label={`Ver ${c.name}`} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Ver</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(c.id)} aria-label={`Editar ${c.name}`} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Editar</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(c.id)} aria-label={`Eliminar ${c.name}`} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Eliminar</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table>
  )
}
