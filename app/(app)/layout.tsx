import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuarioAtual = await getUsuarioAtual();

  if (!usuarioAtual) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-20">{children}</main>
      <Navbar />
      <Toaster />
    </div>
  );
}
