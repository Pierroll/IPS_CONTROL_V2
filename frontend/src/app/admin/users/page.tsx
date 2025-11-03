// frontend/src/app/admin/users/UsersManagement.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import UserTable from "@/components/tables/UserTable"
import CreateUserModal from "@/components/forms/CreateUserModal"
import EditUserModal from "@/components/forms/EditUserModal"
import TechnicianTable from "@/components/tables/TechnicianTable"
import CreateTechnicianModal from "@/components/forms/CreateTechnicianModal"
import EditTechnicianModal from "@/components/forms/EditTechnicianModal"
import { User } from "@/types/user"
import { Technician } from "@/types/technician"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"
import { Users, Ticket, DollarSign, Activity, FileText, Router, Bell } from "lucide-react"

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null)
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [view, setView] = useState<"users" | "technicians">("users")

  useEffect(() => {
    const userData = localStorage.getItem("user_data")

    if (!userData) {
      window.location.href = "/auth"
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    const fetchData = async () => {
      try {
        setLoading(true)
        // Obtener usuarios con rol SELLER
        const usersData = await apiFacade.getUsers("SELLER")
        // Obtener técnicos
        const techniciansData = await apiFacade.getTechnicians()
        console.log("Datos recibidos de usuarios:", usersData)
        console.log("Datos recibidos de técnicos:", techniciansData)
        setUsers(usersData.filter((u) => !u.deletedAt && u.active !== false))
        setTechnicians(techniciansData)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar usuarios o técnicos")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDeleteUser = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      try {
        await apiFacade.deleteUser(id)
        setUsers(users.filter((user) => user.id !== id))
      } catch (err) {
        setError("Error al eliminar usuario")
      }
    }
  }

  const handleDeleteTechnician = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este técnico?")) {
      try {
        await apiFacade.deleteTechnician(id)
        setTechnicians(technicians.filter((tech) => tech.id !== id))
      } catch (err) {
        setError("Error al eliminar técnico")
      }
    }
  }

  const handleEditUser = (id: string) => {
    setSelectedUserId(id)
  }

  const handleEditTechnician = (id: string) => {
    setSelectedTechnicianId(id)
  }

  const handleUserCreated = async () => {
    try {
      const data = await apiFacade.getUsers("SELLER")
      console.log("Usuarios después de crear:", data)
      setUsers(data.filter((u) => !u.deletedAt && u.active !== false))
    } catch (err) {
      setError("Error al recargar usuarios")
    }
  }

  const handleTechnicianCreated = async () => {
    try {
      const data = await apiFacade.getTechnicians()
      console.log("Técnicos después de crear:", data)
      setTechnicians(data)
    } catch (err) {
      setError("Error al recargar técnicos")
    }
  }

  const handleUserUpdated = async () => {
    try {
      const data = await apiFacade.getUsers("SELLER")
      console.log("Usuarios después de actualizar:", data)
      setUsers(data.filter((u) => !u.deletedAt && u.active !== false))
      setSelectedUserId(null)
    } catch (err) {
      setError("Error al recargar usuarios")
    }
  }

  const handleTechnicianUpdated = async () => {
    try {
      const data = await apiFacade.getTechnicians()
      console.log("Técnicos después de actualizar:", data)
      setTechnicians(data)
      setSelectedTechnicianId(null)
    } catch (err) {
      setError("Error al recargar técnicos")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando usuarios o técnicos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardNav
        items={[
          { icon: Users, label: "Usuarios", href: "/admin/users" },
          { icon: DollarSign, label: "Planes", href: "/admin/plans" },
          { icon: Users, label: "Clientes", href: "/admin/customers" },
          { icon: FileText, label: "Facturas y Pagos", href: "/admin/receipts" },
          { icon: Ticket, label: "Tickets", href: "/admin/tickets" },
          { icon: Router, label: "Dispositivos", href: "/admin/devices" },
          { icon: Bell, label: "Notificaciones", href: "/admin/notifications" },
          { icon: Activity, label: "Reportes", href: "/admin/reports" },
        ]}
        userName={user?.name || "Admin"}
      />

      <div className="flex-1 lg:ml-8 p-4 lg:p-6 max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
            <div className="space-x-2">
              <Button
                variant={view === "users" ? "default" : "outline"}
                onClick={() => setView("users")}
              >
                Usuarios
              </Button>
              <Button
                variant={view === "technicians" ? "default" : "outline"}
                onClick={() => setView("technicians")}
              >
                Técnicos
              </Button>
              {view === "users" ? (
                <CreateUserModal onUserCreated={handleUserCreated} />
              ) : (
                <CreateTechnicianModal onTechnicianCreated={handleTechnicianCreated} />
              )}
            </div>
          </div>
          <p className="text-muted-foreground">Administra los usuarios y técnicos del sistema</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Lista de {view === "users" ? "Usuarios" : "Técnicos"}</CardTitle>
          </CardHeader>
          <CardContent>
            {view === "users" ? (
              <UserTable users={users} onDelete={handleDeleteUser} onEdit={handleEditUser} />
            ) : (
              <TechnicianTable
                technicians={technicians}
                onDelete={handleDeleteTechnician}
                onEdit={handleEditTechnician}
              />
            )}
          </CardContent>
        </Card>

        {selectedUserId && (
          <EditUserModal
            userId={selectedUserId}
            onUserUpdated={handleUserUpdated}
            onClose={() => setSelectedUserId(null)}
          />
        )}
        {selectedTechnicianId && (
          <EditTechnicianModal
            technicianId={selectedTechnicianId}
            onTechnicianUpdated={handleTechnicianUpdated}
            onClose={() => setSelectedTechnicianId(null)}
          />
        )}
      </div>
    </div>
  )
}