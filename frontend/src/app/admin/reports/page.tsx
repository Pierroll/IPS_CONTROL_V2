"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardNav from "@/components/layout/DashboardNav";
import apiFacade from "@/lib/apiFacade";
import { toast } from "sonner";
import { Download, Search, Filter, Users, Ticket, DollarSign, FileText, TrendingUp } from "lucide-react";
import { User } from "@/types/user";
import { Router } from "@/types/router";

interface PaymentReport {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
  } | null;
  creator: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface ReportSummary {
  totalPayments: number;
  totalAmount: number;
  byMethod: Record<string, { count: number; total: number }>;
}

interface ReportResponse {
  payments: PaymentReport[];
  summary: ReportSummary;
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Filtros (usamos "all" para los selects, se convierte a "" al enviar)
  const [filters, setFilters] = useState({
    createdBy: "all",
    from: "",
    to: "",
    deviceId: "all",
    customerId: "",
    paymentMethod: "all",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }

    const userData = localStorage.getItem("user_data");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [usersData, routersData] = await Promise.all([
        apiFacade.getUsers(),
        apiFacade.getRouters(),
      ]);
      setUsers(usersData);
      setRouters(routersData);
    } catch (error: any) {
      console.error("Error cargando datos iniciales:", error);
      toast.error("Error al cargar datos iniciales");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    // Mantener "all" en el estado para los selects, se convierte a "" al enviar
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      // Convertir "all" a "" para los filtros antes de enviar
      const filtersToSend: any = {
        ...filters,
        createdBy: filters.createdBy === "all" ? "" : filters.createdBy,
        deviceId: filters.deviceId === "all" ? "" : filters.deviceId,
        paymentMethod: filters.paymentMethod === "all" ? "" : filters.paymentMethod,
      };
      
      // Eliminar campos vacíos para no enviarlos al backend
      Object.keys(filtersToSend).forEach(key => {
        if (filtersToSend[key] === "") {
          delete filtersToSend[key];
        }
      });
      
      console.log("🔍 Buscando con filtros:", filtersToSend);
      const report = await apiFacade.getPaymentReport(filtersToSend);
      console.log("📊 Reporte recibido:", report);
      setReportData(report);
      
      if (report.payments.length === 0) {
        toast.info("No se encontraron pagos con los filtros seleccionados");
      } else {
        toast.success(`Se encontraron ${report.payments.length} pagos`);
      }
    } catch (error: any) {
      console.error("❌ Error generando reporte:", error);
      toast.error(error.message || "Error al generar el reporte");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      // Convertir "all" a "" para los filtros antes de enviar
      const filtersToSend = {
        ...filters,
        createdBy: filters.createdBy === "all" ? "" : filters.createdBy,
        deviceId: filters.deviceId === "all" ? "" : filters.deviceId,
        paymentMethod: filters.paymentMethod === "all" ? "" : filters.paymentMethod,
      };
      await apiFacade.downloadPaymentReportPdf(filtersToSend);
      toast.success("PDF generado y descargado");
    } catch (error: any) {
      console.error("Error generando PDF:", error);
      toast.error(error.message || "Error al generar el PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardNav
        items={[
          { icon: Users, label: "Usuarios", href: "/admin/users" },
          { icon: DollarSign, label: "Planes", href: "/admin/plans" },
          { icon: Users, label: "Clientes", href: "/admin/customers" },
          { icon: FileText, label: "Facturas y Pagos", href: "/admin/receipts" },
          { icon: TrendingUp, label: "Reportes", href: "/admin/reports" },
          { icon: Ticket, label: "Tickets", href: "/admin/tickets" },
        ]}
        userName={user?.name || "Admin"}
      />

      <div className="flex-1 lg:ml-8 p-4 lg:p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Reportes de Pagos</h1>
          </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Usuario */}
              <div className="space-y-2">
                <Label htmlFor="createdBy">Usuario</Label>
                <Select
                  value={filters.createdBy}
                  onValueChange={(value) => handleFilterChange("createdBy", value)}
                >
                  <SelectTrigger id="createdBy">
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha desde */}
              <div className="space-y-2">
                <Label htmlFor="from">Fecha desde</Label>
                <Input
                  id="from"
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFilterChange("from", e.target.value)}
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-2">
                <Label htmlFor="to">Fecha hasta</Label>
                <Input
                  id="to"
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleFilterChange("to", e.target.value)}
                />
              </div>

              {/* MikroTik */}
              <div className="space-y-2">
                <Label htmlFor="deviceId">MikroTik</Label>
                <Select
                  value={filters.deviceId}
                  onValueChange={(value) => handleFilterChange("deviceId", value)}
                >
                  <SelectTrigger id="deviceId">
                    <SelectValue placeholder="Todos los routers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los routers</SelectItem>
                    {routers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.ip})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de pago</Label>
                <Select
                  value={filters.paymentMethod}
                  onValueChange={(value) => handleFilterChange("paymentMethod", value)}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Todos los métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los métodos</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transferencia bancaria</SelectItem>
                    <SelectItem value="CREDIT_CARD">Tarjeta de crédito</SelectItem>
                    <SelectItem value="DEBIT_CARD">Tarjeta de débito</SelectItem>
                    <SelectItem value="CHECK">Cheque</SelectItem>
                    <SelectItem value="DIGITAL_WALLET">Billetera digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botones */}
              <div className="space-y-2 flex items-end">
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleSearch}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={loading || generatingPdf || !reportData}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generatingPdf ? "Generando..." : "PDF"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensaje inicial cuando no hay datos */}
        {!reportData && !loading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-2">
                  No hay datos para mostrar
                </p>
                <p className="text-sm text-muted-foreground">
                  Utiliza los filtros arriba y haz clic en "Buscar" para generar un reporte de pagos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">Buscando pagos...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen */}
        {reportData && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de pagos</p>
                  <p className="text-2xl font-bold">{reportData.summary.totalPayments}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(reportData.summary.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Métodos de pago</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(reportData.summary.byMethod).length}
                  </p>
                </div>
              </div>

              {/* Desglose por método */}
              {Object.keys(reportData.summary.byMethod).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Por método de pago:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(reportData.summary.byMethod).map(([method, data]) => (
                      <div key={method} className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">{method}</p>
                        <p className="text-sm font-semibold">
                          {data.count} pagos - {formatCurrency(data.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabla de pagos */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle>Pagos ({reportData.payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron pagos con los filtros seleccionados
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Cliente</th>
                        <th className="text-left p-2">N° Factura</th>
                        <th className="text-right p-2">Monto</th>
                        <th className="text-left p-2">Método</th>
                        <th className="text-left p-2">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{formatDate(payment.paymentDate)}</td>
                          <td className="p-2">
                            {payment.customer?.name || "N/A"}
                            {payment.customer?.phone && (
                              <span className="text-xs text-muted-foreground block">
                                {payment.customer.phone}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            {payment.invoice?.invoiceNumber || "N/A"}
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="p-2">{payment.paymentMethod}</td>
                          <td className="p-2">
                            {payment.creator?.name || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}
