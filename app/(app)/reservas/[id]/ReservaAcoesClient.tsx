"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  aprovarReservaAction,
  recusarReservaAction,
  cancelarReservaAction,
  cancelarPropriaSolicitacaoAction,
} from "../actions";
import type { ReservaFormState } from "../actions";
import type { Veiculo, StatusReserva } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, CheckCircle, Wrench } from "lucide-react";

// ─── Aprovar ──────────────────────────────────────────────────────────────────

function AprovarSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Aprovando..." : label}
    </Button>
  );
}

interface VeiculoComConflito extends Veiculo {
  temConflito: boolean;
}

export function AprovarSection({
  reservaId,
  veiculos,
}: {
  reservaId: string;
  veiculos: VeiculoComConflito[];
}) {
  const action = aprovarReservaAction.bind(null, reservaId);
  const [state, formAction] = useActionState<ReservaFormState, FormData>(
    action,
    null
  );
  const [selectedId, setSelectedId] = useState("");

  const semConflito = veiculos.filter((v) => !v.em_manutencao && !v.temConflito);
  const comConflito = veiculos.filter((v) => !v.em_manutencao && v.temConflito);
  const emManutencao = veiculos.filter((v) => v.em_manutencao);

  return (
    <div className="space-y-3">
      {state?.success && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {state.success}
        </div>
      )}
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
          {state.error}
        </div>
      )}

      {/* Conflito — re-submit com forcar=1 */}
      {state?.conflito ? (
        <div className="space-y-3">
          <div className="bg-yellow-50 text-yellow-800 text-sm px-4 py-3 rounded-lg border border-yellow-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{state.conflito}</p>
          </div>
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="veiculo_id" value={selectedId} />
            <input type="hidden" name="forcar" value="1" />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedId("");
                window.location.reload();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-700">
              Confirmar mesmo assim
            </Button>
          </form>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Selecionar veículo</Label>
            <select
              name="veiculo_id"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="">Escolha um veículo</option>

              {semConflito.length > 0 && (
                <optgroup label="Disponíveis">
                  {semConflito.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.modelo} — {v.placa} ({v.cor})
                    </option>
                  ))}
                </optgroup>
              )}

              {comConflito.length > 0 && (
                <optgroup label="⚠ Com reserva no período">
                  {comConflito.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.modelo} — {v.placa} ⚠
                    </option>
                  ))}
                </optgroup>
              )}

              {emManutencao.length > 0 && (
                <optgroup label="🔧 Em manutenção (indisponível)" disabled>
                  {emManutencao.map((v) => (
                    <option key={v.id} value={v.id} disabled>
                      {v.modelo} — {v.placa}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {selectedId && comConflito.some((v) => v.id === selectedId) && (
            <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Este veículo já possui reserva aprovada neste período.
            </div>
          )}

          <AprovarSubmit label="Aprovar reserva" />
        </form>
      )}
    </div>
  );
}

// ─── Recusar ──────────────────────────────────────────────────────────────────

export function RecusarButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const recusarBound = recusarReservaAction.bind(null, id);

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        Recusar solicitação
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar reserva?</DialogTitle>
            <DialogDescription>
              Informe o motivo — ele ficará visível para o funcionário.
            </DialogDescription>
          </DialogHeader>
          <form action={recusarBound} className="space-y-4">
            <textarea
              name="motivo"
              placeholder="Motivo da recusa (opcional)"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-700 placeholder:text-gray-400"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" variant="destructive">
                Recusar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Cancelar própria solicitação pendente (funcionário) ─────────────────────

export function CancelarSolicitacaoButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const cancelarBound = cancelarPropriaSolicitacaoAction.bind(null, id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm text-red-500 hover:text-red-700 py-2 transition-colors"
      >
        Cancelar solicitação
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar solicitação?</DialogTitle>
            <DialogDescription>
              Sua solicitação será cancelada. Você pode fazer uma nova solicitação a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Voltar</Button>
            </DialogClose>
            <form action={cancelarBound}>
              <Button type="submit" variant="destructive">
                Cancelar solicitação
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Cancelar (aprovada) ──────────────────────────────────────────────────────

export function CancelarButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const cancelarBound = cancelarReservaAction.bind(null, id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm text-red-500 hover:text-red-700 py-2 transition-colors"
      >
        Cancelar reserva
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva?</DialogTitle>
            <DialogDescription>
              A reserva será marcada como recusada. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Voltar</Button>
            </DialogClose>
            <form action={cancelarBound}>
              <Button type="submit" variant="destructive">
                Cancelar reserva
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
