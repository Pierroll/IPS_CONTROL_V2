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
          <TableHead className="min-w-[80px]">Código</TableHead>
          <TableHead className="min-w-[120px]">Nombre</TableHead>
          <TableHead className="whitespace-nowrap">IP</TableHead>
          <TableHead className="hidden md:table-cell">Distrito</TableHead>
          <TableHead className="text-center">Clientes</TableHead>
          <TableHead className="min-w-[100px]">Estado</TableHead>
          <TableHead className="min-w-[180px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routers.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium" data-label="Código">{r.code}</TableCell>
            <TableCell className="font-medium min-w-[120px]" data-label="Nombre">{r.name}</TableCell>
            <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap" data-label="IP">{r.ipAddress}</TableCell>
            <TableCell className="hidden md:table-cell" data-label="Distrito">{r.district || "N/A"}</TableCell>
            <TableCell className="text-center" data-label="Clientes">{r.totalCustomers || 0}</TableCell>
            <TableCell data-label="Estado">
              <Badge variant={r.status === "ACTIVE" ? "default" : "destructive"}>
                {r.status}
              </Badge>
            </TableCell>
            <TableCell data-label="Acciones">
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onView(r.id)} aria-label={`Ver ${r.name}`} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Ver</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(r.id)} aria-label={`Editar ${r.name}`} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Editar</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSyncProfiles(r)} 
                  aria-label={`Sincronizar perfiles de ${r.name}`}
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Sync</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(r.id)} aria-label={`Eliminar ${r.name}`} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
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
