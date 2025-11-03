// frontend/src/app/admin/plans/PlansManagement.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import PlanTable from "@/components/tables/PlanTable"
import CreatePlanModal from "@/components/forms/CreatePlanModal"
import EditPlanModal from "@/components/forms/EditPlanModal"
import PlanDetailModal from "@/components/forms/PlanDetailModal"
import { Plan } from "@/types/plans"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"
import { Users, Ticket, DollarSign, Activity, Bell, FileText, Router } from "lucide-react"

export default function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedPlanIdForView, setSelectedPlanIdForView] = useState<string | null>(null)
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
      .getPlans(token)
      .then((data) => {
        console.log("Datos recibidos de planes:", data)
        setPlans(data.filter((p) => !p.deletedAt))
      })
      .catch((err) => {
        apiFacade.handleApiError(err as Error)
        setError("Error al cargar planes")
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDeletePlan = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este plan?")) {
      const token = localStorage.getItem("access_token")
      try {
        await apiFacade.deletePlan(id, token)
        setPlans(plans.filter((plan) => plan.id !== id))
      } catch (err) {
        setError("Error al eliminar plan")
      }
    }
  }

  const handleEditPlan = (id: string) => {
    setSelectedPlanId(id)
  }

  const handleViewPlan = (id: string) => {
    setSelectedPlanIdForView(id)
  }

  const handlePlanCreated = () => {
    const token = localStorage.getItem("access_token")
    apiFacade.getPlans(token).then((data) => {
      console.log("Planes después de crear:", data)
      setPlans(data.filter((p) => !p.deletedAt))
    })
  }

  const handlePlanUpdated = () => {
    const token = localStorage.getItem("access_token")
    apiFacade.getPlans(token).then((data) => {
      console.log("Planes después de actualizar:", data)
      setPlans(data.filter((p) => !p.deletedAt))
    })
    setSelectedPlanId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando planes...</p>
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

      <div className="flex-1 lg:ml-8 p-4 lg:p-8">
        <header className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Planes</h1>
            <CreatePlanModal onPlanCreated={handlePlanCreated} />
          </div>
          <p className="text-muted-foreground">Administra los planes del sistema</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Planes</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanTable
              plans={plans}
              onDelete={handleDeletePlan}
              onEdit={handleEditPlan}
              onView={handleViewPlan}
            />
          </CardContent>
        </Card>

        {selectedPlanId && (
          <EditPlanModal
            planId={selectedPlanId}
            onPlanUpdated={handlePlanUpdated}
            onClose={() => setSelectedPlanId(null)}
          />
        )}

        {selectedPlanIdForView && (
          <PlanDetailModal
            planId={selectedPlanIdForView}
            open={!!selectedPlanIdForView}
            onClose={() => setSelectedPlanIdForView(null)}
          />
        )}
      </div>
    </div>
  )
}