// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      const userData = localStorage.getItem("user_data");

      console.log("Verificando autenticación:", { token, userData }); // Log para depuración

      if (!token || !userData) {
        console.log("No hay token o userData, redirigiendo a /auth");
        router.push("/auth");
      } else {
        const user = JSON.parse(userData);
        console.log("Usuario autenticado:", { user });
        const role = user.role.toLowerCase();
        const redirectPath = role === "admin" ? "/admin/dashboard" : "/seller/dashboard";
        console.log(`Redirigiendo a ${redirectPath}`);
        router.push(redirectPath);
      }
    } catch (error) {
      console.error("Error en la redirección:", error);
      router.push("/auth");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground">Cargando...</p>
    </div>
  );
}