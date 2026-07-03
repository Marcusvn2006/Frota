"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { UserRoundCog, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { trocarMotoristaMultaAction, type MultaFormState } from "./actions";

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function TrocarMotoristaButton({
  multaId,
  motoristaAtualId,
  motoristas,
}: {
  multaId: string;
  motoristaAtualId: string | null;
  motoristas: { id: string; nome: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = trocarMotoristaMultaAction.bind(null, multaId);
  const [state, formAction] = useActionState<MultaFormState, FormData>(action, null);

  const sucesso = state !== null && "success" in state;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 underline underline-offset-2"
      >
        <UserRoundCog className="w-3 h-3" />
        {motoristaAtualId ? "Trocar motorista" : "Atribuir motorista"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir motorista</DialogTitle>
            <DialogDescription>
              Escolha quem estava responsável pelo veículo nesta multa.
            </DialogDescription>
          </DialogHeader>

          {sucesso ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Motorista atualizado com sucesso.
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
                <Label htmlFor="motorista_id">Motorista</Label>
                <select
                  id="motorista_id"
                  name="motorista_id"
                  defaultValue={motoristaAtualId ?? ""}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="">Sem motorista</option>
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
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
