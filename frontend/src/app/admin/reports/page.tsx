"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Ticket,
  DollarSign,
  FileText,
  Activity,
  Bell,
  Router,
  Download,
  Filter,
  X,
} from "lucide-react";
import DashboardNav from "@/components/layout/DashboardNav";
import apiFacade from "@/lib/apiFacade";
import { User } from "@/types/user";
import { Router as RouterType } from "@/types/router";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: string;
  paymentNumber: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
  creator: {
    id: string;
    name: string;
  };
  device: {
    id: string;
    name: string;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
  } | null;
}

interface ReportFilters {
  createdBy?: string;
  from?: string;
  to?: string;
  deviceId?: string;
  paymentMethod?: string;
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<RouterType[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("user_data");

    if (!token || !userData) {
      window.location.href = "/auth";
      return;
    }

    setUser(JSON.parse(userData) as User);
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [filters, user]);

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // Cargar usuarios
      const usersData = await apiFacade.getUsers();
      setUsers(usersData);

      // Cargar dispositivos
      const devicesData = await apiFacade.getRouters(token);
      setDevices(Array.isArray(devicesData) ? devicesData : devicesData.data || []);
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const paymentsData = await apiFacade.getPaymentReport(filters);
      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error("Error cargando pagos:", error);
      toast.error(error.message || "Error al cargar los pagos");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value && value !== "all" && value !== "") {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading("Generando reporte PDF...");
      const blob = await apiFacade.downloadPaymentReportPdf(filters);
      
      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Pagos_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success("Reporte descargado exitosamente");
    } catch (error: any) {
      toast.dismiss();
      console.error("Error descargando PDF:", error);
      toast.error(error.message || "Error al descargar el reporte");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(amount));
  };

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (!user) return null;

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
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reportes de Pagos</h1>
              <p className="text-muted-foreground">
                Visualiza y descarga reportes de pagos realizados
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Ocultar" : "Mostrar"} Filtros
              </Button>
              <Button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2"
                disabled={loading || payments.length === 0}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </header>

        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Filtros</CardTitle>
                {(filters.createdBy ||
                  filters.from ||
                  filters.to ||
                  filters.deviceId ||
                  filters.paymentMethod) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="from">Desde</Label>
                  <Input
                    id="from"
                    type="date"
                    value={filters.from || ""}
                    onChange={(e) => handleFilterChange("from", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">Hasta</Label>
                  <Input
                    id="to"
                    type="date"
                    value={filters.to || ""}
                    onChange={(e) => handleFilterChange("to", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createdBy">Usuario que registró</Label>
                  <Select
                    value={filters.createdBy || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("createdBy", value)
                    }
                  >
                    <SelectTrigger id="createdBy">
                      <SelectValue placeholder="Todos los usuarios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviceId">Dispositivo Mikrotik</Label>
                  <Select
                    value={filters.deviceId || "all"}
                    onValueChange={(value) => handleFilterChange("deviceId", value)}
                  >
                    <SelectTrigger id="deviceId">
                      <SelectValue placeholder="Todos los dispositivos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los dispositivos</SelectItem>
                      {devices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de pago</Label>
                  <Select
                    value={filters.paymentMethod || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("paymentMethod", value)
                    }
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Todos los métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los métodos</SelectItem>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Transferencia</SelectItem>
                      <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                      <SelectItem value="DEBIT_CARD">Tarjeta de Débito</SelectItem>
                      <SelectItem value="CHECK">Cheque</SelectItem>
                      <SelectItem value="DIGITAL_WALLET">Billetera Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Pagos ({payments.length})</CardTitle>
              <div className="text-sm text-muted-foreground">
                Total: {formatCurrency(totalAmount)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron pagos con los filtros seleccionados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Dispositivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.paymentNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.customer?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {payment.customer?.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                            {payment.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell>{payment.creator?.name || "-"}</TableCell>
                        <TableCell>{payment.device?.name || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
