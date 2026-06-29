"use client";

import {
  useActionState,
  startTransition,
  useState,
  useCallback,
  useRef,
} from "react";
import { salvarSaidaAction, type ChecklistFormState } from "./actions";
import { compressImage } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Camera } from "lucide-react";
import type { ChecklistItem } from "@/lib/types/database.types";

interface Props {
  checklistId: string;
  reservaId: string;
  itens: ChecklistItem[];
  horaAtual: string;
}

export function SaidaForm({ checklistId, reservaId, itens, horaAtual }: Props) {
  const action = salvarSaidaAction.bind(null, checklistId, reservaId);
  const [state, formAction, isPending] = useActionState<
    ChecklistFormState,
    FormData
  >(action, null);

  const [okMap, setOkMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(itens.map((i) => [i.id, i.ok]))
  );
  const [obsMap, setObsMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(itens.map((i) => [i.id, i.obs ?? ""]))
  );
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoFileRef = useRef<File | null>(null);

  const toggleItem = useCallback((id: string) => {
    setOkMap((prev) => {
      const newOk = !prev[id];
      if (newOk) setObsMap((o) => ({ ...o, [id]: "" }));
      return { ...prev, [id]: newOk };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (fotoFileRef.current) {
      const compressed = await compressImage(fotoFileRef.current);
      fd.set("painel_saida", compressed, "foto.jpg");
    }

    startTransition(() => {
      formAction(fd);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
          {state.error}
        </div>
      )}

      {/* Informações de saída */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Informações de saída</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="km_saida">Km atual</Label>
            <input
              type="number"
              id="km_saida"
              name="km_saida"
              required
              min="0"
              step="0.1"
              placeholder="Ex: 12500"
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hora_saida">Hora de saída</Label>
            <input
              type="time"
              id="hora_saida"
              name="hora_saida"
              required
              defaultValue={horaAtual}
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>
      </div>

      {/* Foto do painel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Foto do painel</h2>
        <p className="text-xs text-gray-500">
          Tire uma foto do painel mostrando a quilometragem atual.
        </p>
        {fotoPreview && (
          <img
            src={fotoPreview}
            alt="Preview do painel"
            className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
          />
        )}
        <label className="flex items-center justify-center gap-2 w-full h-10 rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-600 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
          <Camera className="w-4 h-4" />
          {fotoPreview ? "Trocar foto" : "Tirar / selecionar foto"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                fotoFileRef.current = f;
                setFotoPreview(URL.createObjectURL(f));
              }
            }}
          />
        </label>
      </div>

      {/* Checklist dos 18 itens */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-900">Condições do veículo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Toque em "OK" para marcar como "Não OK". Itens com problema ficam
            registrados.
          </p>
        </div>
        <div className="space-y-2">
          {itens.map((item) => {
            const isOk = okMap[item.id] ?? true;
            return (
              <div key={item.id}>
                <input type="hidden" name="item_id" value={item.id} />
                <input
                  type="hidden"
                  name={`item_${item.id}_ok`}
                  value={isOk ? "true" : "false"}
                />
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    isOk
                      ? "border-gray-200 bg-gray-50"
                      : "border-red-200 bg-red-50"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !isOk && "text-red-800"
                    )}
                  >
                    {item.item}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors shrink-0",
                      isOk
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    )}
                  >
                    {isOk ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        OK
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Não OK
                      </>
                    )}
                  </button>
                </div>
                {!isOk && (
                  <div className="mt-1.5 ml-1">
                    <textarea
                      name={`item_${item.id}_obs`}
                      value={obsMap[item.id] ?? ""}
                      onChange={(e) =>
                        setObsMap((o) => ({
                          ...o,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Descreva o problema..."
                      rows={2}
                      className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar vistoria de saída"}
      </Button>
    </form>
  );
}
