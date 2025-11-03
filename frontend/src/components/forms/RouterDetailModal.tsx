"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wifi,
  WifiOff,
  Users,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  RefreshCw,
  Search,
  Power,
  PowerOff,
  Loader2,
  History,
  CheckCircle2,
  Signal,
} from "lucide-react"
import { toast } from "sonner"
import apiFacade from "@/lib/apiFacade"
import { Router, PPPoEUser, ActiveSession, RouterLog } from "@/types/router"
import { Input } from "@/components/ui/input"

interface RouterDetailModalProps {
  router: Router
  onClose: () => void
  onRefresh: () => void
}

export default function RouterDetailModal({ 
  router: initialRouter, 
  onClose, 
  onRefresh 
}: RouterDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [refreshingMetrics, setRefreshingMetrics] = useState(false)
  const [router, setRouter] = useState(initialRouter)
  const [users, setUsers] = useState<PPPoEUser[]>([])
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [logs, setLogs] = useState<RouterLog[]>([])
  const [searchUser, setSearchUser] = useState("")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

  useEffect(() => {
    loadRouterData()
  }, [router.id])

  const loadRouterData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const fullRouter = await apiFacade.getRouterById(token, router.id)
      setRouter(fullRouter)
    } catch (error) {
      console.error("Error loading router data:", error)
      toast.error("Error al cargar datos del router")
    } finally {
      setLoading(false)
    }
  }

const handleTestConnection = async () => {
    if (!token) return
    setRefreshingMetrics(true)
    
    // Toast de inicio - indica que la prueba comenzó
    const loadingToastId = toast.loading(
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <div>
          <p className="font-semibold text-sm">Probando conexión...</p>
          <p className="text-xs text-muted-foreground">Esto puede tomar unos segundos</p>
        </div>
      </div>,
      {
        position: 'top-center',
        closeButton: false,
        icon: false,
      }
    )
    
    try {
      const result = await apiFacade.testRouterConnectionById(token, router.id)
      
      if (result?.success) {
        // Actualizar el estado local con las métricas recibidas
        if (result.metrics) {
          setRouter(prev => ({
            ...prev,
            ...result.metrics,
            status: 'ACTIVE',
            lastSeen: new Date().toISOString()
          }))
        }
        
        // Actualizar el toast existente en lugar de crear uno nuevo
        toast.success(
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">✓ Conexión Exitosa</p>
              <p className="text-sm text-muted-foreground mb-2">
                El router está respondiendo correctamente
              </p>
              {result.metrics && (
                <div className="text-xs space-y-1 bg-muted/50 rounded p-2">
                  <div className="flex justify-between">
                    <span>CPU:</span>
                    <span className="font-medium">{Number(result.metrics.cpuLoad || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RAM:</span>
                    <span className="font-medium">{Number(result.metrics.memoryUsage || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="font-medium">
                      {Math.floor((result.metrics.uptime || 0) / 86400)}d {Math.floor(((result.metrics.uptime || 0) % 86400) / 3600)}h
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>,
          {
            id: loadingToastId,
            duration: 3000,
            position: 'top-center',
            closeButton: false,
            icon: false,
          }
        )
        
        // Notificar al padre para que actualice la lista (sin recargar todo)
        onRefresh?.()
      } else {
        toast.error(
          <div className="flex items-start gap-3">
            <WifiOff className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">✗ Error de Conexión</p>
              <p className="text-sm text-muted-foreground">
                {result?.error || "No se pudo conectar al router"}
              </p>
            </div>
          </div>,
          {
            id: loadingToastId,
            duration: 3000,
            position: 'top-center',
            closeButton: false,
            icon: false,
          }
        )
      }
    } catch (error: any) {
      toast.error(
        <div className="flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">✗ Error al probar conexión</p>
            <p className="text-sm text-muted-foreground">
              {error.message || "Ocurrió un error inesperado"}
            </p>
          </div>
        </div>,
        {
          id: loadingToastId,
          duration: 3000,
          position: 'top-center',
          closeButton: false,
          icon: false,
        }
      )
    } finally {
      setRefreshingMetrics(false)
    }
  }

  const handleCutService = async (username: string) => {
    if (!token) return
    setLoading(true)
    try {
      toast.info("Función de cortar servicio pendiente de implementar")
    } catch (error: any) {
      toast.error(error.message || "Error al cortar servicio")
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreService = async (username: string) => {
    if (!token) return
    setLoading(true)
    try {
      toast.info("Función de restaurar servicio pendiente de implementar")
    } catch (error: any) {
      toast.error(error.message || "Error al restaurar servicio")
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchUser.toLowerCase())
  )

  const isOnline = router.status === "ACTIVE" && router.lastSeen

  if (loading && !router.id) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Cargando datos del router...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                {router.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {router.ipAddress}:{router.apiPort} • {router.district}, {router.province}
              </p>
              {router.firmware && (
                <p className="text-xs text-muted-foreground">Firmware: {router.firmware}</p>
              )}
            </div>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Stats rápidas */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{router.totalCustomers || 0}</div>
                  <div className="text-xs text-muted-foreground">Clientes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {router.activeConnections || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Activos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {Number(router.cpuLoad || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">CPU</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {Number(router.memoryUsage || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">RAM</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Uptime */}
        {router.uptime && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Uptime: <strong>{Math.floor(router.uptime / 86400)}d {Math.floor((router.uptime % 86400) / 3600)}h</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botón Probar Conexión */}
        <div className="mb-4">
          <Button
            onClick={handleTestConnection}
            disabled={refreshingMetrics}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingMetrics ? "animate-spin" : ""}`} />
            {refreshingMetrics ? "Probando..." : "Probar Conexión"}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="users">Usuarios PPPoE</TabsTrigger>
            <TabsTrigger value="sessions">Sesiones</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalles del Router</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Código:</span> {router.code}</div>
                  <div><span className="text-muted-foreground">Modelo:</span> {router.model || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Marca:</span> {router.brand || 'MikroTik'}</div>
                  <div><span className="text-muted-foreground">IP:</span> {router.ipAddress}:{router.apiPort}</div>
                  <div><span className="text-muted-foreground">MAC:</span> {router.macAddress || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Serial:</span> {router.serialNumber || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Ubicación:</span> {router.location || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Distrito:</span> {router.district}</div>
                  <div><span className="text-muted-foreground">Perfil Normal:</span> {router.normalProfile || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Perfil Corte:</span> {router.cutProfile || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay usuarios PPPoE cargados</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Implementa las rutas en el backend para ver esta información
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.name}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">Perfil: {user.profile}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.disabled === "true" ? "destructive" : "default"}>
                            {user.disabled === "true" ? "Deshabilitado" : "Activo"}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleCutService(user.name)} disabled={loading}>
                            <PowerOff className="h-3 w-3 mr-1" /> Cortar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRestoreService(user.name)} disabled={loading}>
                            <Power className="h-3 w-3 mr-1" /> Restaurar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Sesiones activas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Implementa las rutas en el backend para ver esta información
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Logs de eventos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Implementa las rutas en el backend para ver esta información
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}