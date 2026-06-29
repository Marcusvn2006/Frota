"use client";

import { useActionState, useState } from "react";
import { limparFotosAntigasAction, type LimpezaState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";

function ConfirmarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Excluindo..." : "Confirmar limpeza"}
    </Button>
  );
}

export function LimparStorage({ countAntigas }: { countAntigas: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<LimpezaState, FormData>(
    limparFotosAntigasAction,
    null
  );

  if (state) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Limpeza concluída
            </p>
            <p className="text-sm text-green-700 mt-0.5">
              {state.deletadas} foto{state.deletadas !== 1 ? "s" : ""} excluída
              {state.deletadas !== 1 ? "s" : ""} com sucesso.
            </p>
            {state.falhasStorage > 0 && (
              <p className="text-xs text-yellow-700 mt-1">
                {state.falhasStorage} arquivo
                {state.falhasStorage !== 1 ? "s" : ""} não puderam ser removidos
                do armazenamento, mas os registros foram apagados.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={() => setOpen(true)}
        disabled={countAntigas === 0}
      >
        <Trash2 className="w-4 h-4" />
        {countAntigas === 0
          ? "Nenhuma foto para limpar"
          : `Limpar ${countAntigas} foto${countAntigas !== 1 ? "s" : ""} antigas`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar fotos antigas?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <strong className="text-gray-900">{countAntigas} foto
                  {countAntigas !== 1 ? "s" : ""}</strong> com mais de 6 meses
                  serão permanentemente excluídas do armazenamento.
                </p>
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-yellow-800">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <form action={formAction}>
              <ConfirmarButton />
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
