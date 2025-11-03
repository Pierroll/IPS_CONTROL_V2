"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import apiFacade from "@/lib/apiFacade"
import { toast } from "sonner"
import { TicketCategory, Priority, SLALevel } from "@/types/ticket"
import { Customer } from "@/types/customer"
import { Technician } from "@/types/technician"
import { Plus } from "lucide-react"
import AsyncSelect from "react-select/async"

interface CreateTicketModalProps {
  onTicketCreated: () => void
}

export default function CreateTicketModal({ onTicketCreated }: CreateTicketModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    customerId: "",
    assignedTechnician: "",
    title: "",
    description: "",
    category: "" as TicketCategory,
    priority: "" as Priority,
    serviceAddress: "",
    serviceDistrict: "",
    gpsCoordinates: "",
    notes: "",
    slaLevel: "" as SLALevel,
    dueDate: "",
    estimatedCost: 0,
    estimatedHours: 0,
  })
  const [loading, setLoading] = useState(false)

  // Load customers for AsyncSelect
  const loadCustomers = async (inputValue: string) => {
    try {
      const customers = await apiFacade.getCustomers()
      return customers
        .filter((customer: Customer) =>
          customer.name.toLowerCase().includes(inputValue.toLowerCase())
        )
        .map((customer: Customer) => ({
          value: customer.id,
          label: customer.name,
        }))
    } catch (error) {
      console.error("Error loading customers:", error)
      return []
    }
  }

  // Load technicians for AsyncSelect
  const loadTechnicians = async (inputValue: string) => {
    try {
      const technicians = await apiFacade.getTechnicians()
      return technicians
        .filter((technician: Technician) =>
          technician.name.toLowerCase().includes(inputValue.toLowerCase())
        )
        .map((technician: Technician) => ({
          value: technician.id,
          label: technician.name,
        }))
    } catch (error) {
      console.error("Error loading technicians:", error)
      return []
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "estimatedCost" || name === "estimatedHours" ? Number(value) : value,
    }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAsyncSelectChange = (name: string) => (option: any) => {
    setFormData((prev) => ({ ...prev, [name]: option ? option.value : "" }))
    
    // Si se selecciona un cliente, cargar su información
    if (name === "customerId" && option) {
      loadCustomerInfo(option.value)
    }
  }

  const loadCustomerInfo = async (customerId: string) => {
    try {
      const customer = await apiFacade.getCustomerById(customerId)
      setFormData((prev) => ({
        ...prev,
        serviceAddress: customer.address || "",
        serviceDistrict: customer.district || "",
      }))
    } catch (error) {
      console.error("Error al cargar información del cliente:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customerId || !formData.title || !formData.description || !formData.category || !formData.priority || !formData.serviceDistrict) {
      toast.error("Cliente, título, descripción, categoría, prioridad y distrito son obligatorios")
      return
    }
    
    // Validaciones adicionales
    if (formData.title.length < 5) {
      toast.error("El título debe tener al menos 5 caracteres")
      return
    }
    
    if (formData.description.length < 10) {
      toast.error("La descripción debe tener al menos 10 caracteres")
      return
    }
    
    if (formData.serviceDistrict.length < 3) {
      toast.error("El distrito debe tener al menos 3 caracteres")
      return
    }
    
    setLoading(true)
    try {
      // Preparar datos para envío, convirtiendo strings vacíos a undefined
      const ticketData = {
        ...formData,
        dueDate: formData.dueDate && formData.dueDate.trim() !== "" ? `${formData.dueDate}T00:00:00.000Z` : null,
        serviceAddress: formData.serviceAddress && formData.serviceAddress.trim() !== "" ? formData.serviceAddress : null,
        gpsCoordinates: formData.gpsCoordinates && formData.gpsCoordinates.trim() !== "" ? formData.gpsCoordinates : null,
        notes: formData.notes && formData.notes.trim() !== "" ? formData.notes : null,
        assignedTechnician: formData.assignedTechnician && formData.assignedTechnician.trim() !== "" ? formData.assignedTechnician : null,
        estimatedCost: formData.estimatedCost > 0 ? formData.estimatedCost : null,
        estimatedHours: formData.estimatedHours > 0 ? formData.estimatedHours : null,
        // Campos adicionales que el backend espera
        subcategory: null,
        internalNotes: null,
        clientNotes: null,
        tags: [],
      }
      
      await apiFacade.createTicket(ticketData as any)
      toast.success("Ticket creado exitosamente")
      setOpen(false)
      onTicketCreated()
      setFormData({
        customerId: "",
        assignedTechnician: "",
        title: "",
        description: "",
        category: "" as TicketCategory,
        priority: "" as Priority,
        serviceAddress: "",
        serviceDistrict: "",
        gpsCoordinates: "",
        notes: "",
        slaLevel: "" as SLALevel,
        dueDate: "",
        estimatedCost: 0,
        estimatedHours: 0,
      })
    } catch (error) {
      console.error("Error al crear ticket:", error)
      toast.error("Error al crear ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Crear Nuevo Ticket</DialogTitle>
          <DialogDescription>
            Ingresa los datos del ticket para su creación.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Grid: 2 columns on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Section: Ticket Details */}
              <section className="md:col-span-7">
                <h3 className="text-sm font-medium mb-3">Detalles del Ticket</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="customerId" className="text-sm">
                      Cliente
                    </Label>
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadCustomers}
                      onChange={handleAsyncSelectChange("customerId")}
                      placeholder="Busca un cliente..."
                      noOptionsMessage={() => "No se encontraron clientes"}
                      classNamePrefix="react-select"
                      isDisabled={loading}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#e5e7eb",
                          padding: "0.25rem",
                          borderRadius: "0.375rem",
                          height: "2.5rem",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="assignedTechnicianId" className="text-sm">
                      Técnico
                    </Label>
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadTechnicians}
                      onChange={handleAsyncSelectChange("assignedTechnician")}
                      placeholder="Busca un técnico..."
                      noOptionsMessage={() => "No se encontraron técnicos"}
                      classNamePrefix="react-select"
                      isDisabled={loading}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#e5e7eb",
                          padding: "0.25rem",
                          borderRadius: "0.375rem",
                          height: "2.5rem",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="title" className="text-sm">
                      Título
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                      required
                      minLength={5}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-sm">
                      Categoría
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={handleSelectChange("category")}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TicketCategory.INSTALACION}>Instalación</SelectItem>
                        <SelectItem value={TicketCategory.SOPORTE_TECNICO}>Soporte Técnico</SelectItem>
                        <SelectItem value={TicketCategory.MANTENIMIENTO}>Mantenimiento</SelectItem>
                        <SelectItem value={TicketCategory.RECLAMO}>Reclamo</SelectItem>
                        <SelectItem value={TicketCategory.CONSULTA}>Consulta</SelectItem>
                        <SelectItem value={TicketCategory.SUSPENSION}>Suspensión</SelectItem>
                        <SelectItem value={TicketCategory.REACTIVACION}>Reactivación</SelectItem>
                        <SelectItem value={TicketCategory.CAMBIO_PLAN}>Cambio de Plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="priority" className="text-sm">
                      Prioridad
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={handleSelectChange("priority")}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecciona prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Priority.BAJA}>Baja</SelectItem>
                        <SelectItem value={Priority.MEDIA}>Media</SelectItem>
                        <SelectItem value={Priority.ALTA}>Alta</SelectItem>
                        <SelectItem value={Priority.CRITICA}>Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="slaLevel" className="text-sm">
                      SLA
                    </Label>
                    <Select
                      value={formData.slaLevel}
                      onValueChange={handleSelectChange("slaLevel")}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecciona nivel SLA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SLALevel.BASIC}>Básico</SelectItem>
                        <SelectItem value={SLALevel.STANDARD}>Estándar</SelectItem>
                        <SelectItem value={SLALevel.PREMIUM}>Premium</SelectItem>
                        <SelectItem value={SLALevel.ENTERPRISE}>Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="description" className="text-sm">
                      Descripción
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="min-h-[80px]"
                      disabled={loading}
                      required
                      minLength={10}
                    />
                  </div>
                </div>
              </section>

              <section className="md:col-span-5">
                <h3 className="text-sm font-medium mb-3">Detalles del Servicio</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="serviceAddress" className="text-sm">
                      Dirección
                    </Label>
                    <Input
                      id="serviceAddress"
                      name="serviceAddress"
                      value={formData.serviceAddress}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="serviceDistrict" className="text-sm">
                      Distrito
                    </Label>
                    <Input
                      id="serviceDistrict"
                      name="serviceDistrict"
                      value={formData.serviceDistrict}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                      required
                      minLength={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gpsCoordinates" className="text-sm">
                      Coordenadas GPS
                    </Label>
                    <Input
                      id="gpsCoordinates"
                      name="gpsCoordinates"
                      value={formData.gpsCoordinates}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dueDate" className="text-sm">
                      Fecha Límite
                    </Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="estimatedCost" className="text-sm">
                      Costo Estimado
                    </Label>
                    <Input
                      id="estimatedCost"
                      name="estimatedCost"
                      type="number"
                      value={formData.estimatedCost}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="estimatedHours" className="text-sm">
                      Horas Estimadas
                    </Label>
                    <Input
                      id="estimatedHours"
                      name="estimatedHours"
                      type="number"
                      value={formData.estimatedHours}
                      onChange={handleChange}
                      className="h-10"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-sm">
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      className="min-h-[80px]"
                      disabled={loading}
                    />
                  </div>
                </div>
              </section>
            </div>
            <div className="h-2" />
            
            {/* Botones del formulario */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Ticket"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}