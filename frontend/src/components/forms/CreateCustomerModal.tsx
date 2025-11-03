"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiFacade from "@/lib/apiFacade";
import { CreateCustomerPayload, buildCreateCustomerPayload } from "@/types/customer";
import { buildCreateCustomerPlanPayload } from "@/types/customerPlan";
import { Plan } from "@/types/plans";
import { Router } from "@/types/router";
import { useUbigeo } from "@/lib/ubigeo";

interface CreateCustomerModalProps {
  onCustomerCreated: () => void;
  onClose: () => void;
}

const initialFormData: CreateCustomerPayload = {
  name: "",
  phone: "",
  address: "",
  district: "",
  customerType: "INDIVIDUAL",
  priority: "MEDIA",
  email: null,
  province: null,
  department: null,
  documentNumber: null,
  documentType: null,
  serviceType: null,
  contractDate: null,
  creditLimit: null,
  notes: null,
  tags: [],
  source: null,
  assignedSeller: null,
};

export default function CreateCustomerModal({ onCustomerCreated, onClose }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState<CreateCustomerPayload>(initialFormData);
  const [planId, setPlanId] = useState<string>("");
  const [startDateStr, setStartDateStr] = useState<string>(new Date().toISOString().split("T")[0]);
  const [planNotes, setPlanNotes] = useState<string>("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [selectedRouterId, setSelectedRouterId] = useState<string>("");
  const [pppoeUsername, setPppoeUsername] = useState<string>("");
  const [pppoePassword, setPppoePassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ubigeo (cascada)
  const {
    department, province, district,
    setDepartment, setProvince, setDistrict,
    departments, provinces, districts,
  } = useUbigeo({
    department: formData.department ?? "",
    province: formData.province ?? "",
    district: formData.district ?? "",
  });

  // Sincroniza selects → formData
  useEffect(() => { setFormData((p) => ({ ...p, department: department || null })); }, [department]);
  useEffect(() => { setFormData((p) => ({ ...p, province: province || null })); }, [province]);
  useEffect(() => { setFormData((p) => ({ ...p, district: district || "" })); }, [district]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar planes
        const plansData = await apiFacade.getPlans();
        setPlans(plansData.filter((p: Plan) => !p.deletedAt && p.active));
        
        // Cargar routers
        const token = localStorage.getItem('access_token');
        if (token) {
          const routersData = await apiFacade.getRouters(token);
          setRouters(routersData.filter((r: Router) => r.status === 'ACTIVE'));
        }
      } catch {
        setError("Error al cargar los datos. Intenta de nuevo.");
      }
    };
    fetchData();
  }, []);

  const updateFormData = (field: keyof CreateCustomerPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validadores
  const validateName = (name: string) => (!name || name.length < 3 ? "El nombre debe tener al menos 3 caracteres." : null);
  const validatePhone = (phone: string) => (!/^\+?\d{7,15}$/.test(phone) ? "Ingresa un teléfono válido (7-15 dígitos)." : null);
  const validateAddress = (address: string) => (!address || address.length < 5 ? "La dirección debe tener al menos 5 caracteres." : null);
  const validateDepartment = (d: string | null | undefined) => (!d ? "Selecciona un departamento." : null);
  const validateProvince = (p: string | null | undefined) => (!p ? "Selecciona una provincia." : null);
  const validateDistrict = (dist: string) => (!dist || dist.length < 2 ? "Selecciona un distrito." : null);
  const validateEmail = (email: string | null | undefined) =>
    email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Ingresa un email válido." : null;
  const validateDocumentNumber = (documentNumber: string | null | undefined) =>
    documentNumber && !/^\d{8}$/.test(documentNumber) ? "El DNI debe tener 8 dígitos numéricos." : null;
  const validateNotes = (notes: string | null | undefined) =>
    notes && notes.length > 500 ? "Las notas deben tener menos de 500 caracteres." : null;
  const validatePlanId = (v: string) => (!v ? "Selecciona un plan para asignar." : null);
  const validateUuid = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return id && !uuidRegex.test(id) ? "El ID del plan no es un UUID válido." : null;
  };
  const validateStartDate = (v: string) => {
    if (!v) return "Selecciona una fecha de inicio.";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "La fecha de inicio no es válida.";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d > today ? "La fecha de inicio no puede ser futura." : null;
  };
  const validatePlanNotes = (v: string) => (v && v.length > 500 ? "Las notas de la asignación deben tener menos de 500 caracteres." : null);
  const validateRouter = (v: string) => (!v ? "Selecciona un router MikroTik." : null);
  const validatePppoeUsername = (v: string) => {
    if (!v) return "Ingresa el username PPPoE.";
    if (v.length < 3) return "El username debe tener al menos 3 caracteres.";
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "El username solo puede contener letras, números, guiones y guiones bajos.";
    return null;
  };
  const validatePppoePassword = (v: string) => {
    if (!v) return "Ingresa la contraseña PPPoE.";
    if (v.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return null;
  };

  const validateForm = () => {
    const errors = [
      validateName(formData.name),
      validatePhone(formData.phone),
      validateAddress(formData.address),
      validateDepartment(formData.department),
      validateProvince(formData.province),
      validateDistrict(formData.district),
      validateEmail(formData.email ?? null),
      validateDocumentNumber(formData.documentNumber ?? null),
      validateNotes(formData.notes ?? null),
      validatePlanId(planId),
      validateUuid(planId),
      validateStartDate(startDateStr),
      validatePlanNotes(planNotes),
      validateRouter(selectedRouterId),
      validatePppoeUsername(pppoeUsername),
      validatePppoePassword(pppoePassword),
    ].filter(Boolean) as string[];

    if (errors.length) {
      setError(errors[0]);
      return false;
    }
    return true;
  };

  const handleDniChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dni = e.target.value;
    updateFormData("documentNumber", dni || null);
    updateFormData("documentType", dni ? "DNI" : null);
    setError(null);

    if (dni.length === 8) {
      const err = validateDocumentNumber(dni);
      if (err) {
        setError(err);
        return;
      }
      try {
        const res = await fetch("/api/dni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({} as any));
          if (res.status === 400) setError(errorData.error || "DNI inválido. Verifica el número.");
          else if (res.status === 429) setError("Demasiadas solicitudes. Intenta de nuevo más tarde.");
          else if (res.status === 500) setError("Error en el servidor al consultar el DNI. Intenta de nuevo.");
          else setError(`Error ${res.status}: No se pudo consultar el DNI.`);
          return;
        }
        const data = await res.json();
        if (data.nombre_completo) {
          updateFormData("name", data.nombre_completo);
          setError(null);
        } else {
          setError(data.error || "No se encontró información para este DNI.");
        }
      } catch {
        setError("Error al consultar el DNI. Verifica tu conexión o intenta de nuevo.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }
      const payload = buildCreateCustomerPayload(formData);
      // Agregar routerId, planId y datos PPPoE al payload
      const payloadWithRouter = {
        ...payload,
        routerId: selectedRouterId,
        planId: planId,
        pppoeUsername: pppoeUsername,
        pppoePassword: pppoePassword
      };
      const { customer } = await apiFacade.createCustomer(payloadWithRouter);

      const userId = typeof window !== "undefined"
        ? (localStorage.getItem("user_data") ? JSON.parse(localStorage.getItem("user_data")!)?.id : null)
        : null;

      const planPayload = buildCreateCustomerPlanPayload(customer.id, planId, startDateStr, planNotes, userId);
      await apiFacade.createCustomerPlan(planPayload);

      setSuccessMessage("Cliente y asignación creados exitosamente.");
      setTimeout(() => {
        onCustomerCreated();
        onClose();
      }, 800);
    } catch (err: any) {
      let msg = "Error al crear cliente o asignación.";
      if (err?.message?.includes("Cliente no encontrado")) msg = "El cliente no existe.";
      else if (err?.message?.includes("Plan no encontrado")) msg = "El plan seleccionado no existe.";
      else if (err?.status === 401) msg = "Sesión expirada. Por favor, inicia sesión nuevamente.";
      else if (err?.message?.includes("El email ya está registrado")) msg = "El email ya está registrado.";
      else if (err?.message?.includes("startDate")) msg = "La fecha de inicio no es válida.";
      else msg = `Error: ${err?.message || "Desconocido"}`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden p-0" aria-describedby="create-customer-description">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Crear Cliente</DialogTitle>
          <DialogDescription id="create-customer-description">
            Ingresa los datos del cliente y su asignación inicial.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 overflow-y-auto">
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {successMessage && <p className="text-green-600 text-sm mb-3">{successMessage}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* IZQUIERDA: DATOS DEL CLIENTE */}
              <section className="md:col-span-7">
                <h3 className="text-sm font-medium mb-3">Datos del cliente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="space-y-1">
                    <Label htmlFor="documentNumber">DNI (Obligatorio)</Label>
                    <Input
                      id="documentNumber"
                      className="h-10"
                      value={formData.documentNumber || ""}
                      onChange={handleDniChange}
                      maxLength={8}
                      placeholder="12345678"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      className="h-10"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      className="h-10"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="email">Email (Opcional)</Label>
                    <Input
                      id="email"
                      className="h-10"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => updateFormData("email", e.target.value || null)}
                      disabled={loading}
                    />
                  </div>

                  {/* Dirección */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      className="h-10"
                      value={formData.address}
                      onChange={(e) => updateFormData("address", e.target.value)}
                      required
                      minLength={5}
                      disabled={loading}
                    />
                  </div>

                  {/* Departamento */}
                  <div className="space-y-1">
                    <Label htmlFor="department">Departamento</Label>
                    <Select value={department} onValueChange={setDepartment} disabled={loading}>
                      <SelectTrigger id="department" className="h-10">
                        <SelectValue placeholder="Selecciona departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Provincia */}
                  <div className="space-y-1">
                    <Label htmlFor="province">Provincia</Label>
                    <Select value={province} onValueChange={setProvince} disabled={loading || !department}>
                      <SelectTrigger id="province" className="h-10">
                        <SelectValue placeholder={department ? "Selecciona provincia" : "Primero el departamento"} />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Distrito */}
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="district">Distrito (Obligatorio)</Label>
                    <Select value={district} onValueChange={setDistrict} disabled={loading || !province}>
                      <SelectTrigger id="district" className="h-10">
                        <SelectValue placeholder={province ? "Selecciona distrito" : "Primero la provincia"} />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((di) => (
                          <SelectItem key={di} value={di}>{di}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notas */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="notes">Referencia (Opcional)</Label>
                    <Input
                      id="notes"
                      className="h-10"
                      value={formData.notes || ""}
                      onChange={(e) => updateFormData("notes", e.target.value || null)}
                      placeholder="Ej. Cerca de la plaza principal"
                      disabled={loading}
                    />
                  </div>

                  {/* Tipo de Cliente */}
                  <div className="space-y-1">
                    <Label htmlFor="customerType">Tipo de Cliente</Label>
                    <Select
                      value={formData.customerType || "INDIVIDUAL"}
                      onValueChange={(v) => updateFormData("customerType", v as CreateCustomerPayload["customerType"])}
                      disabled={loading}
                    >
                      <SelectTrigger id="customerType" className="h-10">
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="BUSINESS">Negocio</SelectItem>
                        <SelectItem value="CORPORATION">Corporación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prioridad */}
                  <div className="space-y-1">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select
                      value={formData.priority || "MEDIA"}
                      onValueChange={(v) => updateFormData("priority", v as CreateCustomerPayload["priority"])}
                      disabled={loading}
                    >
                      <SelectTrigger id="priority" className="h-10">
                        <SelectValue placeholder="Seleccione prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJA">Baja</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="CRITICA">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </section>

              {/* DERECHA: ASIGNACIÓN INICIAL */}
              <section className="md:col-span-5">
                <h3 className="text-sm font-medium mb-3">Asignación inicial</h3>
                <p className="text-xs text-muted-foreground mb-3">Se creará con estado ACTIVO y tipo NEW.</p>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <Label>Plan</Label>
                    <Select value={planId} onValueChange={setPlanId} disabled={loading || plans.length === 0}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={plans.length ? "Selecciona un plan" : "Cargando planes..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (S/ {p.monthlyPrice.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Router MikroTik</Label>
                    <Select value={selectedRouterId} onValueChange={setSelectedRouterId} disabled={loading || routers.length === 0}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={routers.length ? "Selecciona un router" : "Cargando routers..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {routers.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.ipAddress})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pppoeUsername">Username PPPoE</Label>
                    <Input
                      id="pppoeUsername"
                      type="text"
                      className="h-10"
                      value={pppoeUsername}
                      onChange={(e) => setPppoeUsername(e.target.value)}
                      placeholder="ej: cliente001"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pppoePassword">Contraseña PPPoE</Label>
                    <Input
                      id="pppoePassword"
                      type="password"
                      className="h-10"
                      value={pppoePassword}
                      onChange={(e) => setPppoePassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="startDate">Fecha de inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      className="h-10"
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      disabled={loading}
                      required
                      pattern="\d{4}-\d{2}-\d{2}"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="planNotes">Notas de la asignación (Opcional)</Label>
                    <Input
                      id="planNotes"
                      className="h-10"
                      value={planNotes}
                      onChange={(e) => setPlanNotes(e.target.value)}
                      placeholder="Ej.: Instalación por la mañana"
                      disabled={loading}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="h-2" />
          </form>
        </div>

        <DialogFooter className="px-6 py-4 sticky bottom-0 bg-background border-t">
          <div className="w-full flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit as any} disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
