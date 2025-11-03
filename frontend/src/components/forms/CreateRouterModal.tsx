import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import apiFacade from "@/lib/apiFacade";
import { useUbigeo } from "@/lib/ubigeo";

interface CreateRouterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRouterModal({ onClose, onSuccess }: CreateRouterModalProps) {
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  // ✅ Hook de UBIGEO (cascada: Departamento → Provincia → Distrito)
  const {
    department,
    province,
    district,
    setDepartment,
    setProvince,
    setDistrict,
    departments,
    provinces,
    districts,
  } = useUbigeo({ department: "Huánuco" }); // Default: Huánuco

  const [formData, setFormData] = useState({
    name: "",
    ipAddress: "",
    apiPort: "8729",
    username: "admin",
    password: "",
    useTls: false,
    location: "",
    model: "",
  });

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const name = formData.name?.trim();
    const ip = formData.ipAddress?.trim();
    const port = Number.parseInt(formData.apiPort, 10);

    if (!name || name.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ip || !ipRegex.test(ip)) return "Ingresa una IP válida (ej. 45.5.56.186).";
    
    if (!Number.isFinite(port) || port < 1 || port > 65535)
      return "El puerto API debe estar entre 1 y 65535.";
    
    if (!formData.username?.trim()) return "El username es obligatorio.";
    
    if (!formData.password || formData.password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    
    // ✅ Validar UBIGEO
    if (!department) return "Selecciona un departamento.";
    if (!province) return "Selecciona una provincia.";
    if (!district) return "Selecciona un distrito.";
    
    return null;
  };

  const handleTestConnection = async () => {
    if (!formData.ipAddress || !formData.apiPort || !formData.username || !formData.password) {
      toast.error("Por favor complete los datos de conexión");
      return;
    }

    setTesting(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const response = await apiFacade.testRouterConnection(token, {
        ipAddress: formData.ipAddress,
        apiPort: Number(formData.apiPort),
        username: formData.username,
        password: formData.password,
        useTls: formData.useTls
      });

      if (response.success) {
        setConnectionSuccess(true);
        toast.success(`✅ Conexión exitosa! Router: ${response.data.name || 'MikroTik'}`);
      } else {
        throw new Error(response.error || 'Error al conectar');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "Error al probar conexión");
      setConnectionSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      // ✅ PAYLOAD SIN createdBy - El backend lo obtiene del token JWT
      const payload = {
        name: formData.name.trim(),
        ipAddress: formData.ipAddress.trim(),
        apiPort: Number.parseInt(formData.apiPort, 10),
        username: formData.username.trim(),
        password: formData.password,
        useTls: !!formData.useTls,
        location: formData.location?.trim() || null,
        model: formData.model?.trim() || null,
        district: district.trim(),
        province: province || "Huánuco",
        department: department || "Huánuco",
        deviceType: "MIKROTIK_ROUTER",
        // ❌ REMOVIDO: createdBy - el backend lo obtiene de req.user.id
      };

      console.log('📤 Enviando payload:', payload);

      const resp = await apiFacade.createRouter(token, payload);
      console.log('🔍 Respuesta del createRouter:', resp);

      if (resp.success) {
        toast.success("✅ Router creado exitosamente");
        onSuccess?.();
        onClose?.();
      } else {
        throw new Error(resp.error || "Error al crear router");
      }
    } catch (err: any) {
      console.error("❌ Error completo creando router:", err);
      console.error("❌ Error message:", err?.message);
      console.error("❌ Error stack:", err?.stack);
      console.error("❌ Error response:", err?.response);
      
      const msg = err?.message || "Error desconocido";
      toast.error(`Error al crear router: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Router MikroTik</DialogTitle>
            <DialogDescription>
              Configura el router con su ubicación (departamento, provincia, distrito) y credenciales de acceso API.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ===== INFORMACIÓN BÁSICA ===== */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Información Básica</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Router *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Ej: Router Centro Huánuco"
                    disabled={loading || testing}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nombre identificable del router
                  </p>
                </div>
                <div>
                  <Label htmlFor="model">Modelo (opcional)</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                    placeholder="Ej: RB750Gr3, hAP ac²"
                    disabled={loading || testing}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Modelo del hardware MikroTik
                  </p>
                </div>
              </div>
            </div>

            {/* ===== UBICACIÓN (UBIGEO) ===== */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Ubicación del Router *</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Departamento */}
                <div>
                  <Label htmlFor="department">Departamento *</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department" disabled={loading || testing}>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dep) => (
                        <SelectItem key={dep} value={dep}>
                          {dep}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Provincia */}
                <div>
                  <Label htmlFor="province">Provincia *</Label>
                  <Select
                    value={province}
                    onValueChange={setProvince}
                    disabled={!department || loading || testing}
                  >
                    <SelectTrigger id="province">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Distrito */}
                <div>
                  <Label htmlFor="district">Distrito *</Label>
                  <Select
                    value={district}
                    onValueChange={setDistrict}
                    disabled={!province || loading || testing}
                  >
                    <SelectTrigger id="district">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((dist) => (
                        <SelectItem key={dist} value={dist}>
                          {dist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dirección exacta (opcional) */}
              <div>
                <Label htmlFor="location">Dirección Exacta (opcional)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="Ej: Jr. 28 de Julio 456, 2do piso"
                  disabled={loading || testing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dirección física donde está instalado el router
                </p>
              </div>
            </div>

            {/* ===== CONFIGURACIÓN DE CONEXIÓN ===== */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Configuración de Conexión API</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ipAddress">IP Pública *</Label>
                  <Input
                    id="ipAddress"
                    value={formData.ipAddress}
                    onChange={(e) => handleChange("ipAddress", e.target.value)}
                    placeholder="Ej: 45.5.56.186"
                    disabled={loading || testing}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    IP pública o accesible del router
                  </p>
                </div>
                <div>
                  <Label htmlFor="apiPort">Puerto API *</Label>
                  <Input
                    id="apiPort"
                    type="number"
                    value={formData.apiPort}
                    onChange={(e) => handleChange("apiPort", e.target.value)}
                    placeholder="8729"
                    disabled={loading || testing}
                    required
                    min={1}
                    max={65535}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Puerto API: 8728 (sin SSL) o 8729 (con SSL)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Usuario API *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    placeholder="admin"
                    disabled={loading || testing}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuario con permisos de API
                  </p>
                </div>
                <div>
                  <Label htmlFor="password">Contraseña API *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="••••••••"
                    disabled={loading || testing}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo 8 caracteres
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={loading || testing}
                  variant="outline"
                >
                  {testing ? "Probando..." : "🔌 Probar Conexión"}
                </Button>
              </div>
            </div>

            {/* ===== BOTONES DE ACCIÓN ===== */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading || testing}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || testing}>
                {loading ? "Creando..." : "✅ Crear Router"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Conexión Exitosa */}
      {connectionSuccess && (
        <Dialog open onOpenChange={() => setConnectionSuccess(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>✅ Conexión Exitosa</DialogTitle>
              <DialogDescription>
                ¡La conexión al router se realizó con éxito! Puedes continuar con la creación.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" onClick={() => setConnectionSuccess(false)}>
                Continuar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}