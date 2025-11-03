"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Ticket, DollarSign, Activity, FileText, Router, Bell } from "lucide-react"
import MetricCard from "@/components/ui/MetricCard"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"

interface User {
  id: string
  email: string
  role: string
  name: string
}

interface DashboardStats {
  totalCustomers: number
  openTickets: number
  totalRevenue: number
  activeServices: number
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

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
    Promise.all([
      apiFacade.getUsers().then((data) => data.length), // Total de usuarios como proxy para clientes
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets?status=open`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()).then((data) => data.length),
      Promise.resolve(500000), // Ingresos totales (dato simulado)
      Promise.resolve(150), // Servicios activos (dato simulado)
    ])
      .then(([totalCustomers, openTickets, totalRevenue, activeServices]) => {
        setStats({ totalCustomers, openTickets, totalRevenue, activeServices })
      })
      .catch((err) => {
        apiFacade.handleApiError(err as Error)
        console.error("Error fetching dashboard stats:", err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

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
        userName={user.name}
      />

      <div className="flex-1 lg:ml-8 p-4 lg:p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">Resumen general del sistema ISP</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Clientes Totales" value={stats?.totalCustomers || 0} icon={Users} />
          <MetricCard title="Tickets Abiertos" value={stats?.openTickets || 0} icon={Ticket} />
          <MetricCard
            title="Ingresos Totales"
            value={`$${stats?.totalRevenue?.toLocaleString() || 0}`}
            icon={DollarSign}
            description="Últimos 30 días"
          />
          <MetricCard
            title="Servicios Activos"
            value={stats?.activeServices || 0}
            icon={Activity}
            description="En curso"
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Gráficos y logs (en desarrollo)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}