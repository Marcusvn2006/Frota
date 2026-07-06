"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { atualizarDataVencimentoAction, type AtualizarDataFormState } from "./actions";
import type { EntidadeVencimento, TipoVencimento } from "@/lib/types/database.types";

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function AtualizarDataButton({
  entidadeTipo,
  entidadeId,
  tipo,
  tipoLabel,
  entidadeNome,
  dataAtual,
}: {
  entidadeTipo: EntidadeVencimento;
  entidadeId: string;
  tipo: TipoVencimento;
  tipoLabel: string;
  entidadeNome: string;
  dataAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const action = atualizarDataVencimentoAction.bind(null, entidadeTipo, entidadeId, tipo);
  const [state, formAction] = useActionState<AtualizarDataFormState, FormData>(action, null);

  const sucesso = state !== null && "success" in state;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 underline underline-offset-2"
      >
        <Pencil className="w-3 h-3" />
        Atualizar data
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar {tipoLabel}</DialogTitle>
            <DialogDescription>{entidadeNome}</DialogDescription>
          </DialogHeader>

          {sucesso ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Data atualizada com sucesso.
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button">Fechar</Button>
                </DialogClose>
              </DialogFooter>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              {state && "error" in state && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                  {state.error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="data_vencimento">Nova data de vencimento</Label>
                <Input
                  id="data_vencimento"
                  name="data_vencimento"
                  type="date"
                  defaultValue={dataAtual}
                  required
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <SalvarButton />
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
