import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 pb-20">{children}</main>
      <Navbar />
      <Toaster />
    </div>
  );
}
