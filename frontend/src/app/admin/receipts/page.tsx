"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ticket, DollarSign, FileText, TrendingUp, Bell, Router, RefreshCw, PowerOff } from "lucide-react";
import DashboardNav from "@/components/layout/DashboardNav";
import EnhancedReceiptsTable from "@/components/tables/EnhancedReceiptsTable";
import AdvancedBillingFilters, { BillingFilters } from "@/components/forms/AdvancedBillingFilters";
import RecordPaymentModal from "@/components/forms/RecordPaymentModal";
import PaymentHistoryModal from "@/components/forms/PaymentHistoryModal";
import AdvancePaymentModal from "@/components/forms/AdvancePaymentModal";
import AdvancePaymentHistoryModal from "@/components/forms/AdvancePaymentHistoryModal";
import apiFacade from "@/lib/apiFacade";
import { Customer } from "@/types/customer";
import { User } from "@/types/user";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipos válidos para el filtro
type FilterKey = "all" | "pending" | "up-to-date";
const isFilterKey = (v: string): v is FilterKey => ["all", "pending", "up-to-date"].includes(v);

export default function ReceiptsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [showAdvancePaymentHistoryModal, setShowAdvancePaymentHistoryModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cuttingAll, setCuttingAll] = useState(false);

  // filtros & paginación
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState<BillingFilters>({
    search: "",
    routerId: "all",
    month: "all",
    status: "all"
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("user_data");

    if (!token || !userData) {
      window.location.href = "/auth";
      return;
    }

    setUser(JSON.parse(userData) as User);
  }, []);

  // Carga inicial + cada vez que cambie page o filter
  useEffect(() => {
    void loadData({ page, filter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  // Aplicar filtros avanzados cuando cambien
  useEffect(() => {
    if (customers && customers.length > 0) {
      applyAdvancedFilters();
    }
  }, [customers, advancedFilters]);

  const loadData = async ({ page, filter }: { page: number; filter: FilterKey }) => {
    setLoading(true);
    try {
      console.log('🔄 Cargando datos...', { page, filter });
      if (filter === "all") {
        // Cargar todos los clientes con todas sus facturas (no solo pendientes)
        const response = await apiFacade.getCustomersWithDetails({ page, limit: 10 });
        console.log('📋 Respuesta de API:', response);
        const customersData = response.data || [];
        console.log('👥 Clientes obtenidos:', customersData.length);
        setCustomers(customersData);
        setFilteredCustomers(customersData); // Inicializar filtrados con todos los datos
        setTotalPages(response.totalPages || 1);
      } else {
        // pending / up-to-date
        const accounts = await apiFacade.getBillingAccounts({ status: filter });
        const mapped = (accounts || []).map((account) => ({
          ...account.customer,
          billingAccount: {
            id: account.id,
            customerId: account.customerId,
            balance: account.balance,
            status: account.status,
            billingCycle: account.billingCycle,
            autoSuspend: account.autoSuspend,
            suspendedAt: account.suspendedAt,
            lastPaymentDate: account.lastPaymentDate,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
          customerPlans: account.customer.customerPlans,
        })) as Customer[];
        setCustomers(mapped);
        setFilteredCustomers(mapped); // Inicializar filtrados con datos filtrados
        setTotalPages(1);
        setPage(1); // asegúrate de volver a 1 cuando cambies a cuentas filtradas
      }
    } catch (err) {
      console.error("❌ Error cargando datos:", err);
      console.error("❌ Error details:", err);
      apiFacade.handleApiError(err as any);
      toast.error("Error al cargar los clientes.");
      setCustomers([]);
      setFilteredCustomers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Handlers UI
  const handleFilterTabs = (value: string) => {
    if (!isFilterKey(value)) return;
    setFilter(value);
    setPage(1);
  };

  const handlePageSelect = (value: string) => {
    const n = Number(value);
    if (!Number.isNaN(n)) setPage(n);
  };

  const handleRefresh = () => {
    void loadData({ page: filter === "all" ? page : 1, filter });
  };

  // Función para aplicar filtros avanzados
  const applyAdvancedFilters = () => {
    if (!customers || customers.length === 0) {
      setFilteredCustomers([]);
      return;
    }
    
    let filtered = [...customers];

    // Filtro por búsqueda de nombre
    if (advancedFilters.search) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(advancedFilters.search.toLowerCase())
      );
    }


    // Filtro por MikroTik (basado en las notas)
    if (advancedFilters.routerId && advancedFilters.routerId !== "all") {
      filtered = filtered.filter(customer => {
        if (!customer.notes) return false;
        // Buscar diferentes patrones de router en las notas
        const routerPatterns = [
          `routerId:${advancedFilters.routerId}`,
          `Router: ${advancedFilters.routerId}`,
          `MikroTik: ${advancedFilters.routerId}`,
          advancedFilters.routerId
        ];
        return routerPatterns.some(pattern => 
          customer.notes.toLowerCase().includes(pattern.toLowerCase())
        );
      });
    }

    // Filtro por mes de deuda (incluye todos los estados)
    if (advancedFilters.month && advancedFilters.month !== "all") {
      filtered = filtered.filter(customer => {
        const latestInvoice = customer.invoices?.[0];
        if (!latestInvoice) {
          // Si no hay factura, verificar si el cliente tiene saldo pendiente
          const balance = customer.billingAccount?.balance || 0;
          return balance > 0; // Incluir clientes con deuda aunque no tengan factura
        }
        
        // Filtrar por mes sin importar el estado de la factura
        const invoiceMonth = new Date(latestInvoice.periodStart).toISOString().slice(0, 7);
        return invoiceMonth === advancedFilters.month;
      });
    }

    // Filtro por estado de pago
    if (advancedFilters.status && advancedFilters.status !== "all") {
      filtered = filtered.filter(customer => {
        const balance = customer.billingAccount?.balance || 0;
        const hasOverdueInvoice = customer.invoices?.some(inv => inv.status === 'OVERDUE');
        
        switch (advancedFilters.status) {
          case 'debt':
            return balance > 0 || hasOverdueInvoice;
          case 'credit':
            return balance < 0;
          case 'current':
            return balance === 0 && !hasOverdueInvoice;
          default:
            return true;
        }
      });
    }

    setFilteredCustomers(filtered);
  };

  // Handlers para filtros avanzados
  const handleAdvancedFiltersChange = (filters: BillingFilters) => {
    setAdvancedFilters(filters);
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      search: "",
      routerId: "all",
      month: "all",
      status: "all"
    });
  };

  const handleCutAllOverdue = async () => {
    if (!confirm("⚠️ ¿Está seguro de cortar el servicio a TODOS los clientes morosos?\n\nEsta acción cambiará el perfil de todos los clientes con deuda pendiente a 'CORTE MOROSO'.\n\nEsta acción no se puede deshacer fácilmente.")) {
      return;
    }

    setCuttingAll(true);
    try {
      const result = await apiFacade.cutAllOverdueCustomers();
      
      if (result.success) {
        const { total, cut, failed } = result.data;
        toast.success(
          `✅ Corte masivo completado: ${cut} clientes cortados exitosamente${failed > 0 ? `, ${failed} fallidos` : ''}`,
          { duration: 5000 }
        );
        
        // Mostrar detalles en consola
        console.log("📊 Resultados del corte masivo:", result.data);
        
        // Recargar datos
        await loadData({ page: filter === "all" ? page : 1, filter });
      } else {
        throw new Error(result.message || "Error al realizar el corte masivo");
      }
    } catch (error: any) {
      console.error("Error en corte masivo:", error);
      toast.error(error.message || "Error al cortar servicios de clientes morosos");
    } finally {
      setCuttingAll(false);
    }
  };

  // Handlers para pagos adelantados
  const handleAdvancePaymentClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAdvancePaymentModal(true);
  };

  const handleAdvancePaymentHistoryClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowAdvancePaymentHistoryModal(true);
  };

  const handlePaymentHistoryClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPaymentHistoryModal(true);
  };

  const handleAdvancePaymentCreated = () => {
    setShowAdvancePaymentModal(false);
    setSelectedCustomer(null);
    // Recargar datos
    void loadData({ page: filter === "all" ? page : 1, filter });
  };

  const handleAdvancePaymentDeleted = () => {
    // Recargar datos
    void loadData({ page: filter === "all" ? page : 1, filter });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="text-foreground">Cargando Pagos...</p>
        </div>
      </div>
    );
  }

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
          { icon: TrendingUp, label: "Reportes", href: "/admin/reports" }
        ]}
        userName={user.name}
      />

      <div className="flex-1 lg:ml-8 p-4 lg:p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Pagos y Cobranzas</h1>
          <p className="text-muted-foreground">Gestión de pagos y recibos de clientes</p>
        </header>

        {/* Filtros Avanzados */}
        <AdvancedBillingFilters
          onFiltersChange={handleAdvancedFiltersChange}
          onClearFilters={handleClearAdvancedFilters}
        />

        {/* === Toolbar compacta (ocupa muy poco espacio) === */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Tabs filtro */}
          <Tabs value={filter} onValueChange={handleFilterTabs} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="up-to-date">Al día</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Controles derecha: página + refrescar */}
          <div className="flex items-center gap-3">
            {filter === "all" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Página</span>
                <Select value={String(page)} onValueChange={handlePageSelect}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue placeholder="Página" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalPages || 1 }).map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">de {totalPages}</span>
              </div>
            )}
            <Button 
              variant="destructive" 
              onClick={handleCutAllOverdue} 
              disabled={cuttingAll || loading}
              className="gap-2"
            >
              <PowerOff className={`h-4 w-4 ${cuttingAll ? 'animate-spin' : ''}`} />
              {cuttingAll ? "Cortando..." : "Cortar Todos los Morosos"}
            </Button>
            <Button variant="outline" onClick={handleRefresh} className="gap-2" disabled={cuttingAll}>
              <RefreshCw className="h-4 w-4" />
              Refrescar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Clientes</CardTitle>
              <div className="text-sm text-muted-foreground">
                {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} 
                {filteredCustomers.length !== customers.length && ` de ${customers.length} total`}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EnhancedReceiptsTable
              customers={filteredCustomers || []}
              onPaymentClick={(customer) => setSelectedCustomer(customer)}
              onDownloadReceipt={(customerId) => {
                // Puedes abrir modal o llamar a apiFacade.downloadInvoicePdf si tienes el id de factura
                console.log("Descargar recibo:", customerId);
              }}
              onViewHistory={(customerId) => {
                setSelectedCustomerId(customerId);
                setShowHistoryModal(true);
              }}
              onAdvancePaymentClick={handleAdvancePaymentClick}
              onAdvancePaymentHistoryClick={handleAdvancePaymentHistoryClick}
              onPaymentHistoryClick={handlePaymentHistoryClick}
            />

            {/* Paginación minimal al pie (solo cuando filter=all) */}
            {filter === "all" && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCustomer && (
          <RecordPaymentModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onPaymentRecorded={() => {
              setLoading(true);
              apiFacade
                .getCustomersWithDetails({ page, limit: 10 })
                .then((response) => {
                  setCustomers(response.data || []);
                  setTotalPages(response.totalPages || 1);
                })
                .catch((err) => {
                  apiFacade.handleApiError(err as any);
                  toast.error("Error al actualizar los clientes.");
                })
                .finally(() => setLoading(false));
            }}
          />
        )}

        {selectedCustomerId && showHistoryModal && (
          <PaymentHistoryModal
            customerId={selectedCustomerId}
            isOpen={showHistoryModal}
            onClose={() => {
              setSelectedCustomerId(null);
              setShowHistoryModal(false);
            }}
          />
        )}

        {selectedCustomer && showAdvancePaymentModal && (
          <AdvancePaymentModal
            customer={selectedCustomer}
            isOpen={showAdvancePaymentModal}
            onClose={() => {
              setSelectedCustomer(null);
              setShowAdvancePaymentModal(false);
            }}
            onAdvancePaymentCreated={handleAdvancePaymentCreated}
          />
        )}

        {selectedCustomerId && showAdvancePaymentHistoryModal && (
          <AdvancePaymentHistoryModal
            customerId={selectedCustomerId}
            isOpen={showAdvancePaymentHistoryModal}
            onClose={() => {
              setSelectedCustomerId(null);
              setShowAdvancePaymentHistoryModal(false);
            }}
            onAdvancePaymentDeleted={handleAdvancePaymentDeleted}
          />
        )}

        {selectedCustomer && showPaymentHistoryModal && (
          <PaymentHistoryModal
            customer={selectedCustomer}
            isOpen={showPaymentHistoryModal}
            onClose={() => {
              setSelectedCustomer(null);
              setShowPaymentHistoryModal(false);
              loadData({ page, filter }); // Recargar datos después de cerrar
            }}
          />
        )}
      </div>
    </div>
  );
}
