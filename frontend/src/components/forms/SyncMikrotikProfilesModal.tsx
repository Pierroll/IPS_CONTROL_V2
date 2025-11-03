import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import apiFacade from "@/lib/apiFacade";
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle } from "lucide-react";

interface SyncMikrotikProfilesModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  routerId: string;
  routerName: string;
  onProfilesSynced: () => void;
}

export default function SyncMikrotikProfilesModal({
  open,
  setOpen,
  routerId,
  routerName,
  onProfilesSynced,
}: SyncMikrotikProfilesModalProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [profiles, setProfiles] = useState<any[]>([]);

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus('idle');
    
    try {
      const response = await apiFacade.testMikrotikConnection(routerId);
      
      if (response.success) {
        setConnectionStatus('success');
        toast.success(`✅ Conexión exitosa al router ${routerName}`);
        
        // Obtener perfiles del router
        const profilesResponse = await apiFacade.getMikrotikProfilesFromRouter(routerId);
        setProfiles(profilesResponse.data || []);
      } else {
        throw new Error(response.error || 'Error al conectar');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error(`❌ Error: ${error.message}`);
      setProfiles([]);
    } finally {
      setTesting(false);
    }
  };

  const handleSyncProfiles = async () => {
    setLoading(true);
    
    try {
      const response = await apiFacade.syncMikrotikProfiles(routerId);
      
      if (response.success) {
        toast.success(`🎉 ${response.message}`);
        onProfilesSynced();
        setOpen(false);
      } else {
        throw new Error(response.error || 'Error al sincronizar perfiles');
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Wifi className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronizar Perfiles PPPoE
          </DialogTitle>
          <DialogDescription>
            Sincronizar los perfiles PPPoE del router <strong>{routerName}</strong> con la base de datos para usarlos como planes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Paso 1: Probar conexión */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Paso 1: Probar Conexión</h3>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={handleTestConnection}
                disabled={testing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  getConnectionIcon()
                )}
                {testing ? 'Probando...' : 'Probar Conexión'}
              </Button>
              
              {connectionStatus === 'success' && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Conexión exitosa
                </span>
              )}
              
              {connectionStatus === 'error' && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Error de conexión
                </span>
              )}
            </div>
          </div>

          {/* Paso 2: Mostrar perfiles encontrados */}
          {profiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">
                Paso 2: Perfiles Encontrados ({profiles.length})
              </h3>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {profiles.map((profile, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{profile.name}</h4>
                        <p className="text-xs text-gray-600">
                          {profile['rate-limit'] || 'Sin límite de velocidad'}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div>Local: {profile['local-address'] || 'N/A'}</div>
                        <div>Remoto: {profile['remote-address'] || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paso 3: Sincronizar */}
          {connectionStatus === 'success' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Paso 3: Sincronizar con Base de Datos</h3>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>¿Qué hace la sincronización?</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• Crea planes en la base de datos basados en los perfiles PPPoE</li>
                  <li>• Asigna precios automáticamente según el nombre del perfil</li>
                  <li>• Los planes estarán disponibles para asignar a clientes</li>
                  <li>• Si un plan ya existe, se actualizará con la información del router</li>
                </ul>
              </div>
              
              <Button
                onClick={handleSyncProfiles}
                disabled={loading}
                className="w-full flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loading ? 'Sincronizando...' : `Sincronizar ${profiles.length} Perfiles`}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
