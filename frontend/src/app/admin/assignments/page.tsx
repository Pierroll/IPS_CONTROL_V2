// frontend/src/app/admin/assignments/AssignmentsManagement.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import AssignmentTable from "@/components/tables/AssignmentTable"
import EditAssignmentModal from "@/components/forms/EditAssignmentModal"
import ViewAssignmentModal from "@/components/forms/ViewAssignmentModal"
import CreateAssignmentModal from "@/components/forms/CreateAssignmentModal"
import { CustomerPlan } from "@/types/customerPlan"
import DashboardNav from "@/components/layout/DashboardNav"
import { Users, Ticket, DollarSign, TrendingUp, Bell } from "lucide-react"
import apiFacade from "@/lib/apiFacade"

export default function AssignmentsManagement() {
  const [assignments, setAssignments] = useState<CustomerPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [selectedViewAssignmentId, setSelectedViewAssignmentId] = useState<string | null>(null)
  const [user, setUser] = useState<{ name: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const userData = localStorage.getItem("user_data")

    if (!token || !userData) {
      window.location.href = "/auth"
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    setLoading(true)
    apiFacade
      .getCustomerPlans()
      .then((data) => {
        console.log("Datos recibidos de asignaciones:", data)
        setAssignments(data)
      })
      .catch((err) => {
        apiFacade.handleApiError(err as Error)
        setError("Error al cargar asignaciones")
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDeleteAssignment = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta asignación?")) {
      try {
        await apiFacade.deleteCustomerPlan(id)
        // Refresh the assignments list from the backend
        const updatedAssignments = await apiFacade.getCustomerPlans()
        setAssignments(updatedAssignments)
      } catch (err) {
        setError("Error al eliminar asignación: " + (err as Error).message)
      }
    }
  }

  const handleEditAssignment = (id: string) => {
    setSelectedAssignmentId(id)
  }

  const handleViewAssignment = (id: string) => {
    setSelectedViewAssignmentId(id)
  }

  const handleAssignmentUpdated = () => {
    apiFacade.getCustomerPlans().then((data) => {
      console.log("Asignaciones después de actualizar:", data)
      setAssignments(data)
    })
    setSelectedAssignmentId(null)
  }

  const handleAssignmentCreated = () => {
    apiFacade.getCustomerPlans().then((data) => {
      console.log("Asignaciones después de crear:", data)
      setAssignments(data)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando asignaciones...</p>
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
          { icon: Users, label: "Clientes", href: "/admin/customers" },
          { icon: DollarSign, label: "Planes", href: "/admin/plans" },
          { icon: Ticket, label: "Asignaciones", href: "/admin/assignments" },
          { icon: Ticket, label: "Tickets", href: "/admin/tickets" },
          { icon: DollarSign, label: "Comprobantes", href: "/admin/receipts" },
          { icon: TrendingUp, label: "Reportes", href: "/admin/reports" },
          { icon: Bell, label: "Notificaciones", href: "/admin/notifications" },
        ]}
        userName={user?.name || "Admin"}
      />

      <div className="flex-1 lg:ml-8 p-4 lg:p-8">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Asignaciones</h1>
            <p className="text-muted-foreground">Administra las asignaciones de planes a clientes</p>
          </div>
          <CreateAssignmentModal onAssignmentCreated={handleAssignmentCreated} />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Asignaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentTable
              assignments={assignments}
              onDelete={handleDeleteAssignment}
              onEdit={handleEditAssignment}
              onView={handleViewAssignment}
            />
          </CardContent>
        </Card>

        {selectedAssignmentId && (
          <EditAssignmentModal
            assignmentId={selectedAssignmentId}
            onAssignmentUpdated={handleAssignmentUpdated}
            onClose={() => setSelectedAssignmentId(null)}
          />
        )}

        {selectedViewAssignmentId && (
          <ViewAssignmentModal
            assignmentId={selectedViewAssignmentId}
            onClose={() => setSelectedViewAssignmentId(null)}
          />
        )}
      </div>
    </div>
  )
}
