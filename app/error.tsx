"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center font-sans">
        <p className="text-5xl mb-3">⚠️</p>
        <h1 className="text-xl font-bold text-gray-900">Algo deu errado</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ocorreu um erro inesperado. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            href="/home"
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Início
          </Link>
        </div>
      </body>
    </html>
  );
}
