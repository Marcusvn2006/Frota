"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import type { Veiculo } from "@/lib/types/database.types";
import {
  editarVeiculoAction,
  ativarManutencaoAction,
  desativarManutencaoAction,
  excluirVeiculoAction,
  limparAtencaoAction,
  type VeiculoFormState,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Wrench, AlertTriangle, Trash2, CheckCircle } from "lucide-react";

// ─── Submit genérico ──────────────────────────────────────────────────────────

function SubmitBtn({ label, pending_label }: { label: string; pending_label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pending_label : label}
    </Button>
  );
}

// ─── Formulário de dados básicos ──────────────────────────────────────────────

export function VeiculoEditForm({ veiculo }: { veiculo: Veiculo }) {
  const action = editarVeiculoAction.bind(null, veiculo.id);
  const [state, formAction] = useActionState(action, null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Dados do veículo</h2>

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
          <Label htmlFor="modelo">Modelo</Label>
          <Input id="modelo" name="modelo" defaultValue={veiculo.modelo} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cor">Cor</Label>
          <Input id="cor" name="cor" defaultValue={veiculo.cor} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="placa">Placa</Label>
          <Input
            id="placa"
            name="placa"
            defaultValue={veiculo.placa}
            maxLength={8}
            className="uppercase"
            required
          />
        </div>

        <SubmitBtn label="Salvar alterações" pending_label="Salvando..." />
      </form>
    </div>
  );
}

// ─── Seção de status ──────────────────────────────────────────────────────────

export function StatusSection({
  veiculo,
  itensReprovados = [],
}: {
  veiculo: Veiculo;
  itensReprovados?: { item: string; obs: string | null }[];
}) {
  const [showManutencaoForm, setShowManutencaoForm] = useState(false);

  const ativarBound = ativarManutencaoAction.bind(null, veiculo.id);
  const [manutState, manutAction] = useActionState<VeiculoFormState, FormData>(
    ativarBound,
    null
  );

  const desativarBound = desativarManutencaoAction.bind(null, veiculo.id);
  const limparBound = limparAtencaoAction.bind(null, veiculo.id);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">Status</h2>

      {/* Precisa atenção */}
      {veiculo.precisa_atencao && (
        <div className="flex items-start justify-between gap-3 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Precisa de atenção</p>
              {itensReprovados.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {itensReprovados.map((it) => (
                    <li key={it.item} className="text-xs text-yellow-700">
                      • {it.item}
                      {it.obs ? <span className="text-yellow-600">: {it.obs}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-yellow-700 mt-0.5">
                  Um item foi reprovado no último checklist.
                </p>
              )}
            </div>
          </div>
          <form action={limparBound}>
            <button
              type="submit"
              className="text-xs text-yellow-700 underline underline-offset-2 hover:text-yellow-900 shrink-0"
            >
              Limpar
            </button>
          </form>
        </div>
      )}

      {/* Manutenção ativa */}
      {veiculo.em_manutencao ? (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm font-medium text-red-800">Em manutenção</p>
            </div>
            {veiculo.manutencao_motivo && (
              <p className="text-xs text-red-700 ml-6">{veiculo.manutencao_motivo}</p>
            )}
          </div>

          <form action={desativarBound}>
            <Button type="submit" variant="outline" className="w-full">
              Remover da manutenção
            </Button>
          </form>
        </div>
      ) : (
        /* Botão para ativar manutenção */
        <div className="space-y-3">
          {!veiculo.precisa_atencao && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Disponível para reservas</span>
            </div>
          )}

          {!showManutencaoForm ? (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => setShowManutencaoForm(true)}
            >
              <Wrench className="w-4 h-4" />
              Enviar para manutenção
            </Button>
          ) : (
            <form action={manutAction} className="space-y-3">
              {manutState?.error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
                  {manutState.error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="motivo">Motivo da manutenção</Label>
                <Textarea
                  id="motivo"
                  name="motivo"
                  placeholder="Descreva o problema ou serviço..."
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowManutencaoForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Excluir veículo ──────────────────────────────────────────────────────────

export function ExcluirSection({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const excluirBound = excluirVeiculoAction.bind(null, id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 py-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Excluir veículo
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir veículo?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O veículo será removido permanentemente.
              Não é possível excluir veículos com reservas vinculadas.
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
