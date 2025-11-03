"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
}

interface DashboardNavProps {
  items: NavItem[]
  userName: string
  appName?: string
  version?: string
}

// Ancho del sidebar (si quieres más, usa: w-[26rem] y en las páginas: lg:ml-[26rem])
const SIDEBAR_WIDTH = "w-72"

export default function DashboardNav({ items, userName, appName = "Panel Admin", version = "" }: DashboardNavProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_data")
    router.push("/auth")
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 border-r border-border bg-card",
          "transform transition-transform duration-300 ease-in-out",
          SIDEBAR_WIDTH,
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto",
          "flex flex-col"
        ].join(" ")}
        role="navigation"
        aria-label="Barra lateral"
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-foreground">{appName}</div>
            {version ? <div className="text-xs text-muted-foreground">v{version}</div> : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav scrollable */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {items.map((item, index) => (  // Usamos 'index' como clave si no hay id
              <li key={index}>
                <Link
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-base transition",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  ].join(" ")}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 opacity-90" />
                  <span className="truncate font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer fijo */}
        <div className="shrink-0 mt-auto border-t border-border px-4 py-3">
          <div className="text-base text-muted-foreground mb-2">
            Bienvenido, <span className="font-medium text-foreground">{userName}</span>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Botón hamburguesa en móvil */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50"
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </Button>
    </>
  )
}