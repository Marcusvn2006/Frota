import { Truck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center">
            <Truck className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Frota
          </h1>
          <p className="text-sm text-gray-500">Controle de frota</p>
        </div>

        {children}
      </div>
    </div>
  );
}
