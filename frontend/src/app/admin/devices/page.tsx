"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Router as RouterIcon,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  Users,
  Server,
  DollarSign,
  Ticket,
  Bell,
  FileText,
} from "lucide-react"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"
import { Router } from "@/types/router"
import CreateRouterModal from "@/components/forms/CreateRouterModal"
import RouterDetailModal from "@/components/forms/RouterDetailModal"
import RouterTable from "@/components/tables/RouterTable"
import SyncMikrotikProfilesModal from "@/components/forms/SyncMikrotikProfilesModal"
import { toast } from "sonner"

export default function DevicesPage() {
  const router = useRouter()

  const [routers, setRouters] = useState<Router[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRouter, setSelectedRouter] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [selectedRouterForSync, setSelectedRouterForSync] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<{ name: string } | null>(null)

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!t) {
      router.push("/auth")
      return
    }
    setToken(t)

    const userData = typeof window !== "undefined" ? localStorage.getItem("user_data") : null
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {}
    }
  }, [router])

  useEffect(() => {
    if (token) void loadData()
  }, [token])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const routersData = await apiFacade.getRouters(token)
      console.log('📥 Routers cargados:', routersData)
      setRouters(routersData)
    } catch (error) {
      console.error("Error loading devices:", error)
      toast.error("Error al cargar dispositivos")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadData()
    toast.success("Lista actualizada")
  }

  const handleViewDetails = async (routerId: string) => {
    if (!token) return
    try {
      const fullRouter = await apiFacade.getRouterById(token, routerId)
      setSelectedRouter(fullRouter)
      setShowDetailModal(true)
    } catch (error) {
      toast.error("Error al cargar detalles del router")
    }
  }

  const handleEdit = (routerId: string) => {
    toast.info("Función de editar próximamente")
    // TODO: Implementar EditRouterModal
  }

  const handleDelete = async (routerId: string) => {
    if (!token) return
    if (!confirm("¿Estás seguro de eliminar este router?")) return
    
    try {
      await apiFacade.deleteRouter(token, routerId)
      toast.success("Router eliminado")
      await loadData()
    } catch (error) {
      toast.error("Error al eliminar router")
    }
  }

  const handleSyncProfiles = (router: Router) => {
    setSelectedRouterForSync(router)
    setShowSyncModal(true)
  }

  const handleProfilesSynced = () => {
    toast.success("Perfiles sincronizados exitosamente")
    // Opcional: recargar datos o actualizar estado
  }

  const stats = {
    totalRouters: routers.length,
    onlineRouters: routers.filter(r => r.status === 'ACTIVE').length,
    totalCustomers: routers.reduce((sum, r) => sum + (r.totalCustomers || 0), 0),
    activeConnections: routers.reduce((sum, r) => sum + (r.activeConnections || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando dispositivos...</p>
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
          { icon: RouterIcon, label: "Dispositivos", href: "/admin/devices" },
          { icon: Bell, label: "Notificaciones", href: "/admin/notifications" },
          { icon: Activity, label: "Reportes", href: "/admin/reports" },
        ]}
        userName={user?.name || "Admin"}
      />

      <div className="flex-1 lg:ml-8 p-4 lg:p-8">
        <header className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <RouterIcon className="h-8 w-8" />
                Routers MikroTik
              </h1>
              <p className="text-muted-foreground">Gestión centralizada de dispositivos de red</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Router
              </Button>
            </div>
          </div>
        </header>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Routers</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRouters}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.onlineRouters}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalRouters > 0
                  ? ((stats.onlineRouters / stats.totalRouters) * 100).toFixed(1)
                  : 0}% disponibilidad
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <WifiOff className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.totalRouters - stats.onlineRouters}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeConnections} conexiones activas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Routers */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Routers</CardTitle>
          </CardHeader>
          <CardContent>
            {routers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Server className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold mb-2">No hay routers registrados</p>
                <p className="text-muted-foreground mb-4">Comienza agregando tu primer router</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Router
                </Button>
              </div>
            ) : (
              <RouterTable
                routers={routers}
                onView={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSyncProfiles={handleSyncProfiles}
              />
            )}
          </CardContent>
        </Card>

        {/* Modales */}
        {showCreateModal && (
          <CreateRouterModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              void loadData()
            }}
          />
        )}

        {showDetailModal && selectedRouter && (
          <RouterDetailModal
            router={selectedRouter}
            onClose={() => {
              setShowDetailModal(false)
              setSelectedRouter(null)
            }}
            onRefresh={loadData}
          />
        )}

        {showSyncModal && selectedRouterForSync && (
          <SyncMikrotikProfilesModal
            open={showSyncModal}
            setOpen={setShowSyncModal}
            routerId={selectedRouterForSync.id}
            routerName={selectedRouterForSync.name}
            onProfilesSynced={handleProfilesSynced}
          />
        )}
      </div>
    </div>
  )
}
