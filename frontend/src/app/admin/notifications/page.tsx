"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bell,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Ticket,
  Activity,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Wifi,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"
import { toast } from "sonner"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/es"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale("es")

interface User {
  id: string
  email: string
  role: string
  name: string
}

interface Notification {
  id: string
  customer: { name: string; phone?: string } | null
  message: string
  channel: string
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "READ"
  sentAt: string
  errorMessage?: string | null
  customerId: string
  phoneNumber?: string
}

export default function NotificationsPage() {
  const router = useRouter()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [filterChannel, setFilterChannel] = useState<string>("ALL")
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [sendingDebtBulk, setSendingDebtBulk] = useState(false)
  const [generatingDebt, setGeneratingDebt] = useState(false)
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [debtSendingProgress, setDebtSendingProgress] = useState<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{
      customerId: string;
      customerName: string;
      status: 'success' | 'failed';
      message?: string;
      phoneNumber?: string;
    }>;
  }>({ total: 0, sent: 0, failed: 0, results: [] })
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

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

  useEffect(() => {
    filterNotifications()
    setCurrentPage(1) // Reset a la primera página cuando cambien los filtros
  }, [searchTerm, filterStatus, filterChannel, notifications])

  // Calcular datos de paginación
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex)

  // Funciones de paginación
  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const notificationsData = await apiFacade.getNotifications()
      
      // Mapear los datos de MessageLog al formato del componente
      const mappedNotifications: Notification[] = notificationsData.map((msg: any) => ({
        id: msg.id,
        customer: msg.customer ? { name: msg.customer.name, phone: msg.customer.phone } : null,
        message: msg.content,
        channel: msg.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email',
        status: msg.status === 'SENT' ? 'SENT' : msg.status === 'FAILED' ? 'FAILED' : 'PENDING',
        sentAt: msg.sentAt ? msg.sentAt.toISOString() : msg.createdAt.toISOString(),
        errorMessage: msg.errorMessage || null,
        customerId: msg.customerId || 'unknown',
        phoneNumber: msg.phoneNumber || msg.customer?.phone || null,
      }))

      setNotifications(mappedNotifications)
      setFilteredNotifications(mappedNotifications)
    } catch (error) {
      console.error("Error loading notifications:", error)
      toast.error("Error al cargar notificaciones")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadData()
    toast.success("Lista actualizada")
  }

  const handleSendReminder = async (customerId: string, notificationId: string) => {
    if (!token) return
    setSendingId(notificationId)
    
    try {
      const notification = notifications.find(n => n.id === notificationId)
      if (!notification) {
        toast.error("Notificación no encontrada")
        return
      }

      await apiFacade.sendNotification({
        customerId,
        message: notification.message,
        invoiceId: undefined
      })
      
      toast.success("Notificación enviada exitosamente")
      await loadData() // Recargar para obtener el estado actualizado
    } catch (error) {
      console.error("Error sending notification:", error)
      toast.error("Error al enviar notificación")
    } finally {
      setSendingId(null)
    }
  }

  const handleSendBulkReminders = async () => {
    if (!token) return
    
    const targetNotifications = filteredNotifications.filter(n => n.status === "PENDING")
    
    if (targetNotifications.length === 0) {
      toast.warning("No hay notificaciones pendientes para enviar")
      return
    }

    if (!confirm(`¿Está seguro de enviar ${targetNotifications.length} notificación(es)?`)) {
      return
    }

    setSendingBulk(true)
    
    try {
      const customerIds = targetNotifications.map(n => n.customerId)
      const message = "Recordatorio de pago pendiente. Por favor, regularice su situación."

      const result = await apiFacade.sendBulkNotifications({
        customerIds,
        message
      })
      
      toast.success(`${result.sent} notificación(es) enviada(s) exitosamente`)
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} notificación(es) fallaron`)
      }
      
      await loadData() // Recargar datos
    } catch (error) {
      console.error("Error sending bulk notifications:", error)
      toast.error("Error al enviar notificaciones")
    } finally {
      setSendingBulk(false)
    }
  }

  const handleGenerateDebt = async () => {
    if (!token) return

    if (!confirm("¿Está seguro de generar las deudas mensuales? Esto creará facturas para todos los clientes activos.")) {
      return
    }

    setGeneratingDebt(true)
    
    try {
      const result = await apiFacade.generateMonthlyDebt()
      toast.success(result.message)
      await loadData() // Recargar datos
    } catch (error) {
      console.error("Error generando deudas:", error)
      toast.error("Error al generar deudas mensuales")
    } finally {
      setGeneratingDebt(false)
    }
  }

  const handleSendDebtReminders = async () => {
    if (!token) return
    
    // Obtener clientes con saldo pendiente
    try {
      const billingAccounts = await apiFacade.getBillingAccounts({ status: 'pending' })
      
      if (billingAccounts.length === 0) {
        toast.warning("No hay clientes con saldo pendiente")
        return
      }

      if (!confirm(`¿Está seguro de enviar recordatorios de deuda a ${billingAccounts.length} cliente(s)?`)) {
        return
      }

      setSendingDebtBulk(true)
      setDebtSendingProgress({
        total: billingAccounts.length,
        sent: 0,
        failed: 0,
        results: []
      })

      const results = []
      let sent = 0
      let failed = 0

      for (const account of billingAccounts) {
        try {
          const customer = account.customer
          const planName = customer.customerPlans?.[0]?.plan?.name || 'tu servicio'
          const balance = Number(account.balance || 0).toFixed(2)
          
          // Obtener la factura más reciente para este cliente
          const invoices = await apiFacade.getInvoices({ customerId: customer.id })
          const latestInvoice = invoices.find(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE')
          
          const name = customer.name.toUpperCase()
          const invoiceNumber = latestInvoice?.invoiceNumber || 'N/A'
          const dueMonth = latestInvoice ? 
            new Date(latestInvoice.periodStart).toLocaleString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase() : 
            new Date().toLocaleString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase()
          
          const message = `${name} Su servicio *Internet* está próximo a vencer.

✅ Con N. de recibo: ${invoiceNumber}
✅ del mes de: ${dueMonth}
✅ Con periodo de pago: *25 De cada mes*
✅ Con día de corte: *1 De cada mes*
✅ Monto a pagar de: *${balance}*

📢 *${name}*, se le recuerda que siempre debe enviar la constancia de pago para su registro.

💳 NUESTROS MEDIOS DE PAGO

📢 DEPOSITOS O TRANSFERENCIAS:
✅ BANCO DE LA NACION: 04582008812
✅ BANCO DE CREDITO: 56091215165073
✅ BANCO CONTINENTAL: 56091215165073
✅ CAJA PIURA: 210010010931
✅ CAJA HUANCAYO: 107072211001713046

✅ TITULAR DE LAS CTA.: BRUNO RUFFNER HASSINGER

📢 PAGOS POR APP

✅ PLIN: 987121219
✅ TITULAR DEL PLIN: BRUNO RUFFNER HASSINGER

✅ YAPE: 987121219
✅ TITULAR DEL YAPE.: BRUNO RUFFNER HASSINGER

🚨 Si eres del extrajero recuerdo pedir el link de pago 😉

✅ OJO: Enviar foto del Boucher del depósito o trasferencia al https://wa.me/51987121219, para que le se suba su pago al sistema y le envié su recibo digital.

📢 Nota: Pedir que le envíen su comprobante.

Horario de atención:
LUNES A SABADO
⏲ 8.00 AM a 6.00 PM.

Att. Área de Cobranzas.`

          await apiFacade.sendNotification({
            customerId: customer.id,
            message,
            invoiceId: latestInvoice?.id
          })

          sent++
          results.push({
            customerId: customer.id,
            customerName: customer.name,
            status: 'success' as const,
            phoneNumber: customer.phone || 'N/A'
          })

          // Actualizar progreso
          setDebtSendingProgress(prev => ({
            ...prev,
            sent,
            results: [...prev.results, {
              customerId: customer.id,
              customerName: customer.name,
              status: 'success' as const,
              phoneNumber: customer.phone || 'N/A'
            }]
          }))

          // Pequeño delay para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          failed++
          results.push({
            customerId: account.customer.id,
            customerName: account.customer.name,
            status: 'failed' as const,
            message: error instanceof Error ? error.message : 'Error desconocido',
            phoneNumber: account.customer.phone || 'N/A'
          })

          // Actualizar progreso
          setDebtSendingProgress(prev => ({
            ...prev,
            failed,
            results: [...prev.results, {
              customerId: account.customer.id,
              customerName: account.customer.name,
              status: 'failed' as const,
              message: error instanceof Error ? error.message : 'Error desconocido',
              phoneNumber: account.customer.phone || 'N/A'
            }]
          }))
        }
      }

      toast.success(`Envío completado: ${sent} exitosos, ${failed} fallidos`)
      await loadData() // Recargar datos

    } catch (error) {
      console.error("Error sending debt reminders:", error)
      toast.error("Error al obtener clientes con deuda")
    } finally {
      setSendingDebtBulk(false)
    }
  }

  const filterNotifications = () => {
    const filtered = notifications.filter((notification) => {
      const matchesSearch =
        notification.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        filterStatus === "ALL" || notification.status === filterStatus

      const matchesChannel =
        filterChannel === "ALL" || notification.channel === filterChannel

      return matchesSearch && matchesStatus && matchesChannel
    })
    setFilteredNotifications(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      SENT: { icon: CheckCircle2, text: "Enviado", className: "bg-green-500 text-white" },
      PENDING: { icon: Clock, text: "Pendiente", className: "bg-yellow-500 text-white" },
      FAILED: { icon: XCircle, text: "Fallido", className: "bg-red-500 text-white" },
    }

    const config = variants[status as keyof typeof variants]
    const Icon = config.icon

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const getChannelIcon = (channel: string) => {
    const icons = {
      Email: Mail,
      SMS: Phone,
      WhatsApp: MessageSquare,
    }
    return icons[channel as keyof typeof icons] || Mail
  }

  const getChannelBadge = (channel: string) => {
    const colors = {
      Email: "bg-blue-100 text-blue-800",
      SMS: "bg-purple-100 text-purple-800",
      WhatsApp: "bg-green-100 text-green-800",
    }

    const ChannelIcon = getChannelIcon(channel)

    return (
      <Badge variant="outline" className={colors[channel as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        <ChannelIcon className="w-3 h-3 mr-1" />
        {channel}
      </Badge>
    )
  }

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === "SENT").length,
    pending: notifications.filter(n => n.status === "PENDING").length,
    failed: notifications.filter(n => n.status === "FAILED").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando notificaciones...</p>
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
          { icon: Wifi, label: "Dispositivos", href: "/admin/devices" },
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
                <Bell className="h-8 w-8" />
                Notificaciones
              </h1>
              <p className="text-muted-foreground">Gestión de notificaciones y recordatorios</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button 
                onClick={handleSendBulkReminders}
                disabled={sendingBulk || filteredNotifications.filter(n => n.status === "PENDING").length === 0}
                className="flex items-center gap-2"
              >
                {sendingBulk ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Pendientes ({filteredNotifications.filter(n => n.status === "PENDING").length})
                  </>
                )}
              </Button>
              <Button
                onClick={handleGenerateDebt}
                disabled={generatingDebt}
                variant="outline"
                className="flex items-center gap-2"
              >
                {generatingDebt ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Generar Deudas
                  </>
                )}
              </Button>
              <Button 
                onClick={handleSendDebtReminders}
                disabled={sendingDebtBulk}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {sendingDebtBulk ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Enviando Deudas...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4" />
                    Enviar Recordatorios de Deuda
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? ((stats.sent / stats.total) * 100).toFixed(1)
                  : 0}% completado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Progreso de Envío Masivo de Deudas */}
        {sendingDebtBulk && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Enviando Recordatorios de Deuda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Barra de progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso: {debtSendingProgress.sent + debtSendingProgress.failed} / {debtSendingProgress.total}</span>
                    <span className="text-green-600">✓ {debtSendingProgress.sent} exitosos</span>
                    <span className="text-red-600">✗ {debtSendingProgress.failed} fallidos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${debtSendingProgress.total > 0 ? ((debtSendingProgress.sent + debtSendingProgress.failed) / debtSendingProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Lista de resultados en tiempo real */}
                {debtSendingProgress.results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Resultados en tiempo real:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {debtSendingProgress.results.map((result, index) => (
                        <div 
                          key={`${result.customerId}-${index}`}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            result.status === 'success' 
                              ? 'bg-green-50 text-green-800 border border-green-200' 
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium">{result.customerName}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span className="font-mono">{result.phoneNumber || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs">
                            {result.status === 'success' ? 'Enviado' : result.message || 'Error'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por cliente o mensaje..."
                  className="w-full pl-10 p-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  onChange={(e) => setFilterStatus(e.target.value)}
                  value={filterStatus}
                  className="p-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="SENT">Enviadas</option>
                  <option value="FAILED">Fallidas</option>
                </select>

                <select
                  onChange={(e) => setFilterChannel(e.target.value)}
                  value={filterChannel}
                  className="p-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  <option value="ALL">Todos los canales</option>
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Notificaciones ({filteredNotifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold mb-2">No se encontraron notificaciones</p>
                <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Cliente</th>
                      <th className="text-left p-4 font-medium">Teléfono</th>
                      <th className="text-left p-4 font-medium">Mensaje</th>
                      <th className="text-left p-4 font-medium">Canal</th>
                      <th className="text-left p-4 font-medium">Estado</th>
                      <th className="text-left p-4 font-medium">Fecha</th>
                      <th className="text-left p-4 font-medium">Error</th>
                      <th className="text-right p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentNotifications.map((notification) => (
                      <tr key={notification.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">
                          {notification.customer?.name || "N/A"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-mono">
                              {notification.phoneNumber || notification.customer?.phone || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 max-w-xs truncate">
                          {notification.message}
                        </td>
                        <td className="p-4">{getChannelBadge(notification.channel)}</td>
                        <td className="p-4">{getStatusBadge(notification.status)}</td>
                        <td className="p-4">
                          <div className="text-sm">
                            {dayjs(notification.sentAt).tz("America/Lima").format("DD/MM/YYYY")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dayjs(notification.sentAt).tz("America/Lima").format("HH:mm")}
                          </div>
                        </td>
                        <td className="p-4">
                          {notification.errorMessage ? (
                            <span className="text-xs text-red-600">
                              {notification.errorMessage}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {notification.status === "PENDING" || notification.status === "FAILED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(notification.customerId, notification.id)}
                              disabled={sendingId === notification.id}
                            >
                              {sendingId === notification.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  {notification.status === "FAILED" ? "Reintentar" : "Enviar"}
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendReminder(notification.customerId, notification.id)}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reenviar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Controles de paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, filteredNotifications.length)} de {filteredNotifications.length} notificaciones
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}