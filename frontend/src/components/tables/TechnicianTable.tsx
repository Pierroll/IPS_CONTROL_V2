// src/components/tables/TechnicianTable.tsx
"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"
import { Technician } from "@/types/technician"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface TechnicianTableProps {
  technicians: Technician[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export default function TechnicianTable({ technicians, onDelete, onEdit }: TechnicianTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Distrito</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {technicians.map((technician) => (
          <TableRow key={technician.id}>
            <TableCell>{technician.code}</TableCell>
            <TableCell>{technician.name}</TableCell>
            <TableCell>{technician.phone}</TableCell>
            <TableCell>{technician.district}</TableCell>
            <TableCell>
              <Badge variant={technician.active ? "default" : "secondary"}>
                {technician.active ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(technician.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
{/*                 <Link href={`/admin/technicians/${technician.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link> */}
                <Button variant="destructive" size="sm" onClick={() => onDelete(technician.id)}>
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