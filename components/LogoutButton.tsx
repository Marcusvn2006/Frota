"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/actions";

export function LogoutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-blue-200 hover:text-white transition-colors p-1"
        aria-label="Sair da conta"
      >
        <LogOut className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Sair da conta?
                </h2>
                <p className="text-sm text-gray-500">
                  Você precisará fazer login novamente.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <form action={logoutAction} className="flex-1">
                <Button type="submit" variant="destructive" className="w-full">
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
