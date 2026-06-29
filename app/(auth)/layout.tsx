import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image
            src="/Logo.png"
            alt="Ervas Finas"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Ervas Finas
          </h1>
          <p className="text-sm text-gray-500">Controle de frota</p>
        </div>

        {children}
      </div>
    </div>
  );
}
