"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, MapPin, Router, Calendar } from "lucide-react";
import apiFacade from "@/lib/apiFacade";
import { toast } from "sonner";

interface AdvancedBillingFiltersProps {
  onFiltersChange: (filters: BillingFilters) => void;
  onClearFilters: () => void;
}

export interface BillingFilters {
  search: string;
  routerId: string;
  month: string;
  status: string;
}

export default function AdvancedBillingFilters({ 
  onFiltersChange, 
  onClearFilters 
}: AdvancedBillingFiltersProps) {
  const [filters, setFilters] = useState<BillingFilters>({
    search: "",
    routerId: "all",
    month: "all",
    status: "all"
  });

  const [routers, setRouters] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos para los filtros
  useEffect(() => {
    const loadFilterData = async () => {
      setLoading(true);
      try {
        // Cargar routers
        const token = localStorage.getItem("access_token");
        if (token) {
          console.log("🔍 Cargando routers con token:", token.substring(0, 20) + "...");
          const routersResponse = await apiFacade.getRouters(token);
          console.log("📡 Respuesta de routers:", routersResponse);
          
          // getRouters devuelve directamente un array o un objeto con data
          let routersData: Array<{id: string, name: string}> = [];
          if (Array.isArray(routersResponse)) {
            // Si es un array directo, mapear a {id, name}
            routersData = routersResponse.map((r: any) => ({
              id: r.id || r.deviceId || '',
              name: r.name || r.code || 'Sin nombre'
            })).filter((r: any) => r.id); // Filtrar los que no tienen id
          } else if (routersResponse && routersResponse.data && Array.isArray(routersResponse.data)) {
            routersData = routersResponse.data.map((r: any) => ({
              id: r.id || r.deviceId || '',
              name: r.name || r.code || 'Sin nombre'
            })).filter((r: any) => r.id);
          } else if (routersResponse && routersResponse.success && Array.isArray(routersResponse.data)) {
            routersData = routersResponse.data.map((r: any) => ({
              id: r.id || r.deviceId || '',
              name: r.name || r.code || 'Sin nombre'
            })).filter((r: any) => r.id);
          }
          
          console.log("🖥️ Routers cargados:", routersData);
          setRouters(routersData);
        } else {
          console.log("❌ No hay token para cargar routers");
        }
      } catch (error) {
        console.error("Error cargando datos de filtros:", error);
        toast.error("Error al cargar los routers para el filtro");
      } finally {
        setLoading(false);
      }
    };

    loadFilterData();
  }, []);

  // Generar meses para el filtro
  const generateMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
      });
      months.push({ key: monthKey, label: monthLabel });
    }
    
    return months;
  };

  const months = generateMonths();

  const handleFilterChange = (key: keyof BillingFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: BillingFilters = {
      search: "",
      district: "all",
      routerId: "all",
      month: "all",
      status: "all"
    };
    setFilters(emptyFilters);
    onClearFilters();
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== "" && value !== "all").length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avanzados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Buscador por nombre */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Search className="h-3 w-3" />
              Buscar Cliente
            </label>
            <Input
              placeholder="Nombre del cliente..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="text-sm"
            />
          </div>


          {/* Filtro por MikroTik */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Router className="h-3 w-3" />
              MikroTik
            </label>
            <Select 
              value={filters.routerId} 
              onValueChange={(value) => handleFilterChange("routerId", value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos los routers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los routers</SelectItem>
                {routers.map((router) => (
                  <SelectItem key={router.id} value={router.id}>
                    {router.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por mes de deuda */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Mes de Deuda
            </label>
            <Select 
              value={filters.month} 
              onValueChange={(value) => handleFilterChange("month", value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos los meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.key} value={month.key}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="debt">En Deuda</SelectItem>
                <SelectItem value="credit">A Favor</SelectItem>
                <SelectItem value="current">Al Día</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mostrar filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              {filters.search && (
                <Badge variant="outline" className="text-xs">
                  Cliente: {filters.search}
                </Badge>
              )}
              {filters.routerId && filters.routerId !== "all" && (
                <Badge variant="outline" className="text-xs">
                  MikroTik: {routers.find(r => r.id === filters.routerId)?.name}
                </Badge>
              )}
              {filters.month && filters.month !== "all" && (
                <Badge variant="outline" className="text-xs">
                  Mes: {months.find(m => m.key === filters.month)?.label}
                </Badge>
              )}
              {filters.status && filters.status !== "all" && (
                <Badge variant="outline" className="text-xs">
                  Estado: {filters.status === 'debt' ? 'En Deuda' : 
                           filters.status === 'credit' ? 'A Favor' : 'Al Día'}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
