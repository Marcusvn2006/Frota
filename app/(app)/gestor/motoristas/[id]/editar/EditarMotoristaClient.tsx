"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import type { Motorista } from "@/lib/types/database.types";
import { editarMotoristaAction, excluirMotoristaAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Trash2, CheckCircle } from "lucide-react";

function SubmitBtn({ label, pending_label }: { label: string; pending_label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pending_label : label}
    </Button>
  );
}

// ─── Formulário de dados ──────────────────────────────────────────────────────

export function MotoristaEditForm({ motorista }: { motorista: Motorista }) {
  const action = editarMotoristaAction.bind(null, motorista.id);
  const [state, formAction] = useActionState(action, null);
  const sincronizado = !!motorista.usuario_id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Dados do motorista</h2>
        {sincronizado ? (
          <Badge variant="secondary">Com login</Badge>
        ) : (
          <Badge variant="outline">Terceirizado</Badge>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {state.success}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            defaultValue={motorista.nome}
            readOnly={sincronizado}
            className={sincronizado ? "bg-gray-50 text-gray-500" : undefined}
            required
          />
          {sincronizado && (
            <p className="text-xs text-gray-400">
              Nome sincronizado com a conta de usuário deste motorista.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cnh_numero">Número da CNH</Label>
          <Input
            id="cnh_numero"
            name="cnh_numero"
            defaultValue={motorista.cnh_numero ?? ""}
            placeholder="Opcional"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cnh_categoria">Categoria da CNH</Label>
          <select
            id="cnh_categoria"
            name="cnh_categoria"
            defaultValue={motorista.cnh_categoria ?? ""}
            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione (opcional)</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cnh_validade">Validade da CNH</Label>
          <Input
            id="cnh_validade"
            name="cnh_validade"
            type="date"
            defaultValue={motorista.cnh_validade ?? ""}
          />
        </div>

        <SubmitBtn label="Salvar alterações" pending_label="Salvando..." />
      </form>
    </div>
  );
}

// ─── Excluir motorista ────────────────────────────────────────────────────────

export function ExcluirSection({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const excluirBound = excluirMotoristaAction.bind(null, id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 py-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Excluir motorista
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir motorista?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O motorista será removido permanentemente.
              Não é possível excluir motoristas com reservas ou vencimentos vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <form action={excluirBound}>
              <Button type="submit" variant="destructive">
                Excluir
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
