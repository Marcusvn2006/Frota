"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Car, ImageIcon, BookUser, CalendarSearch, BarChart2 } from "lucide-react";
import { useUsuario } from "@/hooks/useUsuario";
import { cn } from "@/lib/utils";

const navFuncionario = [
  { href: "/home", icon: Home, label: "Início" },
  { href: "/reservas", icon: Calendar, label: "Reservas" },
  { href: "/minhas-reservas", icon: BookUser, label: "Minhas" },
  { href: "/veiculos/disponibilidade", icon: CalendarSearch, label: "Disponível" },
  { href: "/manutencao", icon: Car, label: "Veículos" },
];

const navGestor = [
  { href: "/home", icon: Home, label: "Início" },
  { href: "/reservas", icon: Calendar, label: "Reservas" },
  { href: "/gestor/relatorios", icon: BarChart2, label: "Relatórios" },
  { href: "/galeria", icon: ImageIcon, label: "Galeria" },
  { href: "/gestor/veiculos", icon: Car, label: "Veículos" },
];

const ROUTE_PARENT: Record<string, string> = {
  "/checklist": "/minhas-reservas",
  "/gestor/reservas": "/reservas",
  "/veiculos": "/veiculos/disponibilidade",
  "/gestor/relatorios": "/gestor/relatorios",
};

function resolveParent(path: string): string {
  for (const [prefix, parent] of Object.entries(ROUTE_PARENT)) {
    if (path.startsWith(prefix)) return parent;
  }
  return path;
}

export function Navbar() {
  const pathname = usePathname();
  const { isGestor, loading } = useUsuario();

  if (loading) return null;

  const items = isGestor ? navGestor : navFuncionario;
  const effectivePath = resolveParent(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/home"
              ? effectivePath === href
              : effectivePath === href || effectivePath.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors",
                active
                  ? "text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon
                className={cn("w-5 h-5", active ? "stroke-[2.5]" : "stroke-2")}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
