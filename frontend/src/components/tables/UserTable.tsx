// frontend/src/components/UserTable.tsx
"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"
import { User } from "@/types/user"
import { Badge } from "@/components/ui/badge"
import UserDetailModal from "@/components/forms/UserDetailModal"

interface UserTableProps {
  users: User[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export default function UserTable({ users, onDelete, onEdit }: UserTableProps) {
  const [viewUserId, setViewUserId] = useState<string | null>(null)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Nombre</TableHead>
            <TableHead className="min-w-[180px]">Email</TableHead>
            <TableHead className="min-w-[100px]">Rol</TableHead>
            <TableHead className="min-w-[100px]">Estado</TableHead>
            <TableHead className="min-w-[140px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium" data-label="Nombre">{user.name || "Sin nombre"}</TableCell>
              <TableCell className="min-w-[180px] break-all" data-label="Email">{user.email}</TableCell>
              <TableCell className="min-w-[100px]" data-label="Rol">{user.role}</TableCell>
              <TableCell data-label="Estado">
                <Badge variant={user.active ? "default" : "secondary"}>
                  {console.log("Usuario en tabla:", user), user.active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell data-label="Acciones">
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewUserId(user.id)}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Ver</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(user.id)}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Editar</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(user.id)}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Eliminar</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {viewUserId && (
        <UserDetailModal
          userId={viewUserId}
          onClose={() => setViewUserId(null)}
        />
      )}
    </>
  )
}