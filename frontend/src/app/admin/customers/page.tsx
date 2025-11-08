"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CustomerTable from "@/components/tables/CustomerTable"
import CreateCustomerModal from "@/components/forms/CreateCustomerModal"
import EditCustomerModal from "@/components/forms/EditCustomerModal"
import CustomerDetailModal from "@/components/forms/CustomerDetailModal"
import { Customer } from "@/types/customer"
import DashboardNav from "@/components/layout/DashboardNav"
import apiFacade from "@/lib/apiFacade"
import { Users, Ticket, DollarSign, Activity, Bell, FileText, Router, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function CustomersManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [user, setUser] = useState<{ name: string } | null>(null)

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
        const customersData = await apiFacade.getCustomers()
        console.log("Datos recibidos de clientes:", customersData)
        const filtered = customersData.filter((c) => !c.deletedAt && c.status !== "INACTIVE")
        setCustomers(filtered)
        setFilteredCustomers(filtered)
      } catch (err) {
        console.error("Error al cargar clientes:", err)
        setError("Error al cargar clientes")
        alert("Error al cargar clientes")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filtrar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers)
      return
    }

    const term = searchTerm.toLowerCase().trim()
    const filtered = customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || ""
      const code = customer.code?.toLowerCase() || ""
      const email = customer.email?.toLowerCase() || ""
      const phone = customer.phone?.toLowerCase() || ""
      const documentNumber = customer.documentNumber?.toLowerCase() || ""
      const district = customer.district?.toLowerCase() || ""
      
      return (
        name.includes(term) ||
        code.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        documentNumber.includes(term) ||
        district.includes(term)
      )
    })
    
    setFilteredCustomers(filtered)
  }, [searchTerm, customers])

  const handleDeleteCustomer = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
      try {
        await apiFacade.deleteCustomer(id)
        const updated = customers.filter((customer) => customer.id !== id)
        setCustomers(updated)
        // Re-aplicar filtro si hay búsqueda activa
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim()
          const filtered = updated.filter((customer) => {
            const name = customer.name?.toLowerCase() || ""
            const code = customer.code?.toLowerCase() || ""
            const email = customer.email?.toLowerCase() || ""
            const phone = customer.phone?.toLowerCase() || ""
            const documentNumber = customer.documentNumber?.toLowerCase() || ""
            const district = customer.district?.toLowerCase() || ""
            
            return (
              name.includes(term) ||
              code.includes(term) ||
              email.includes(term) ||
              phone.includes(term) ||
              documentNumber.includes(term) ||
              district.includes(term)
            )
          })
          setFilteredCustomers(filtered)
        } else {
          setFilteredCustomers(updated)
        }
        alert("Cliente eliminado correctamente")
      } catch (err) {
        console.error("Error al eliminar cliente:", err)
        setError("Error al eliminar cliente")
        alert("Error al eliminar cliente")
      }
    }
  }

  const handleEditCustomer = (id: string) => {
    setSelectedCustomerId(id)
  }

  const handleViewCustomer = async (id: string) => {
    try {
      console.log(`Cargando detalles del cliente con ID: ${id}`)
      const customer = await apiFacade.getCustomerById(id)
      console.log("Cliente cargado:", customer)
      setSelectedCustomer(customer)
    } catch (err) {
      console.error("Error al cargar detalles del cliente:", err)
      alert("Error al cargar detalles del cliente")
    }
  }

  const handleCustomerCreated = async () => {
    try {
      const data = await apiFacade.getCustomers()
      console.log("Clientes después de crear:", data)
      const filtered = data.filter((c) => !c.deletedAt && c.status !== "INACTIVE")
      setCustomers(filtered)
      setFilteredCustomers(filtered)
      setIsCreateModalOpen(false)
      alert("Cliente creado correctamente")
    } catch (err) {
      console.error("Error al recargar clientes:", err)
      setError("Error al recargar clientes")
      alert("Error al recargar clientes")
    }
  }

  const handleCustomerUpdated = async () => {
    try {
      const data = await apiFacade.getCustomers()
      console.log("Clientes después de actualizar:", data)
      const filtered = data.filter((c) => !c.deletedAt && c.status !== "INACTIVE")
      setCustomers(filtered)
      setFilteredCustomers(filtered)
      setSelectedCustomerId(null)
      alert("Cliente actualizado correctamente")
    } catch (err) {
      console.error("Error al recargar clientes:", err)
      setError("Error al recargar clientes")
      alert("Error al recargar clientes")
    }
  }

  const handleCloseModal = () => {
    setSelectedCustomer(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando clientes...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Gestión de Clientes</h1>
            <div className="space-x-2">
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Crear Cliente
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">Administra los clientes del sistema</p>
        </header>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Clientes</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, código, email, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {filteredCustomers.length} de {customers.length} clientes
              </p>
            )}
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 && searchTerm ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron clientes que coincidan con "{searchTerm}"</p>
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                  className="mt-4"
                >
                  Limpiar búsqueda
                </Button>
              </div>
            ) : (
              <CustomerTable
                customers={filteredCustomers}
                onDelete={handleDeleteCustomer}
                onEdit={handleEditCustomer}
                onView={handleViewCustomer}
              />
            )}
          </CardContent>
        </Card>

        {isCreateModalOpen && (
          <CreateCustomerModal
            open={isCreateModalOpen}
            onCustomerCreated={handleCustomerCreated}
            onClose={() => setIsCreateModalOpen(false)}
          />
        )}

        {selectedCustomerId && (
          <EditCustomerModal
            customerId={selectedCustomerId}
            onCustomerUpdated={handleCustomerUpdated}
            onClose={() => setSelectedCustomerId(null)}
          />
        )}

        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  )
}
