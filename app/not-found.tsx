import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-black text-gray-200">404</p>
      <h1 className="text-xl font-bold text-gray-900 mt-3">Página não encontrada</h1>
      <p className="text-sm text-gray-500 mt-1">
        O link pode ter expirado ou a página foi removida.
      </p>
      <Link
        href="/home"
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
