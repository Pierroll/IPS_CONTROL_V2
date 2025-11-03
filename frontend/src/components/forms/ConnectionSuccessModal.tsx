// src/components/ui/ConnectionSuccessModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConnectionSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

const ConnectionSuccessModal = ({ open, onClose }: ConnectionSuccessModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[50vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conexión Exitosa</DialogTitle>
          <DialogDescription>
            ¡La conexión al router se realizó con éxito! Ahora puedes continuar con la configuración.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionSuccessModal;
