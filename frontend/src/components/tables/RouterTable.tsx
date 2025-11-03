// src/components/tables/RouterTable.tsx
"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye, RefreshCw } from "lucide-react"
import { Router } from "@/types/router"
import { Badge } from "@/components/ui/badge"

interface RouterTableProps {
  routers: Router[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onView: (id: string) => void
  onSyncProfiles: (router: Router) => void
}

export default function RouterTable({ routers, onDelete, onEdit, onView, onSyncProfiles }: RouterTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Distrito</TableHead>
          <TableHead>Clientes</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routers.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.code}</TableCell>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.ipAddress}</TableCell>
            <TableCell>{r.district || "N/A"}</TableCell>
            <TableCell>{r.totalCustomers || 0}</TableCell>
            <TableCell>
              <Badge variant={r.status === "ACTIVE" ? "default" : "destructive"}>
                {r.status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onView(r.id)} aria-label={`Ver ${r.name}`}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(r.id)} aria-label={`Editar ${r.name}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSyncProfiles(r)} 
                  aria-label={`Sincronizar perfiles de ${r.name}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(r.id)} aria-label={`Eliminar ${r.name}`}>
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
