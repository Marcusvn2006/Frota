import Link from "next/link";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function ProfileMenu({ nome }: { nome: string }) {
  return (
    <Link
      href="/perfil"
      className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-blue-300 transition-all"
      aria-label="Meu perfil"
    >
      {iniciais(nome) || "?"}
    </Link>
  );
}
