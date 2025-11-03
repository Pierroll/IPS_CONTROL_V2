"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"
import { Ticket as TicketType } from "@/types/ticket"
import { useRouter } from "next/navigation"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import CreateTicketModal from "@/components/forms/CreateTicketModal"
import EditTicketModal from "@/components/forms/EditTicketModal"
import TicketDetailModal from "@/components/forms/TicketDetailModal"
import ChangeTicketStatusModal from "@/components/modals/ChangeTicketStatusModal"
import TicketTable from "@/components/tables/TicketTable"
import { Users, Ticket, DollarSign, FileText, TrendingUp, Bell, Router, Plus, Edit, Trash } from "lucide-react"

dayjs.extend(utc)
dayjs.extend(timezone)

interface User {
  id: string
  email: string
  role: string
  name: string
}

export default function TicketsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedTicketIdForView, setSelectedTicketIdForView] = useState<string | null>(null)
  const [selectedTicketIdForStatus, setSelectedTicketIdForStatus] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const userData = localStorage.getItem("user_data")

    if (!token || !userData) {
      window.location.href = "/auth"
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    const fetchTickets = async () => {
      setLoading(true)
      try {
        const { data } = await apiFacade.getTickets({ status: "PENDIENTE", page: 1, limit: 20 })
        setTickets(data)
      } catch (err) {
        apiFacade.handleApiError(err as Error)
        setError("Error al cargar tickets")
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [])

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("¿Seguro que desea eliminar este ticket?")) return
    try {
      await apiFacade.deleteTicket(id)
      setTickets(tickets.filter((ticket) => ticket.id !== id))
      alert("Ticket eliminado exitosamente")
    } catch (err) {
      apiFacade.handleApiError(err as Error)
      console.error("Error deleting ticket:", err)
      alert("Error al eliminar el ticket")
    }
  }

  const handleStatusChange = (id: string) => {
    setSelectedTicketIdForStatus(id)
  }

  const handleStatusChanged = async () => {
    setSelectedTicketIdForStatus(null)
    // Recargar tickets para mostrar el nuevo estado
    try {
      const response = await apiFacade.getTickets()
      setTickets(response.data || response)
    } catch (error) {
      console.error("Error al recargar tickets:", error)
    }
  }

  const handleEditTicket = (id: string) => {
    setSelectedTicketId(id)
  }

  const handleViewTicket = (id: string) => {
    setSelectedTicketIdForView(id)
  }

  const handleTicketCreated = () => {
    const fetchTickets = async () => {
      try {
        const { data } = await apiFacade.getTickets({ status: "PENDIENTE", page: 1, limit: 20 })
        setTickets(data)
      } catch (err) {
        console.error("Error refreshing tickets:", err)
      }
    }
    fetchTickets()
  }

  const handleTicketUpdated = () => {
    const fetchTickets = async () => {
      try {
        const { data } = await apiFacade.getTickets({ status: "PENDIENTE", page: 1, limit: 20 })
        setTickets(data)
      } catch (err) {
        console.error("Error refreshing tickets:", err)
      }
    }
    fetchTickets()
    setSelectedTicketId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando Tickets...</p>
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
          { icon: TrendingUp, label: "Reportes", href: "/admin/reports" },
        ]}
        userName={user.name}
      />
      <div className="flex-1 lg:ml-8 p-4 lg:p-6 max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
              <p className="text-muted-foreground">Gestión de tickets de soporte e instalación</p>
            </div>
            <CreateTicketModal onTicketCreated={handleTicketCreated} />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketTable
              tickets={tickets}
              onDelete={handleDeleteTicket}
              onEdit={handleEditTicket}
              onView={handleViewTicket}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>

        {selectedTicketId && (
          <EditTicketModal
            ticketId={selectedTicketId}
            onTicketUpdated={handleTicketUpdated}
            onClose={() => setSelectedTicketId(null)}
          />
        )}

        {selectedTicketIdForView && (
          <TicketDetailModal
            ticketId={selectedTicketIdForView}
            open={!!selectedTicketIdForView}
            onClose={() => setSelectedTicketIdForView(null)}
          />
        )}

        {selectedTicketIdForStatus && (
          <ChangeTicketStatusModal
            open={!!selectedTicketIdForStatus}
            setOpen={(open) => !open && setSelectedTicketIdForStatus(null)}
            ticketId={selectedTicketIdForStatus}
            currentStatus={tickets.find(t => t.id === selectedTicketIdForStatus)?.status || "PENDIENTE" as any}
            onStatusChanged={handleStatusChanged}
          />
        )}
      </div>
    </div>
  )
}