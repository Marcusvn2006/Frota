"use client";

import { useActionState, startTransition, useState, useRef } from "react";
import { salvarChegadaAction, type ChecklistFormState } from "./actions";
import { compressImage } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";

interface Props {
  checklistId: string;
  reservaId: string;
  kmSaida: number;
  horaAtual: string;
}

export function ChegadaForm({ checklistId, reservaId, kmSaida, horaAtual }: Props) {
  const action = salvarChegadaAction.bind(null, checklistId, reservaId);
  const [state, formAction, isPending] = useActionState<
    ChecklistFormState,
    FormData
  >(action, null);

  const [abasteceu, setAbasteceu] = useState(false);
  const [painelPreview, setPainelPreview] = useState<string | null>(null);
  const [cupomPreview, setCupomPreview] = useState<string | null>(null);
  const painelFileRef = useRef<File | null>(null);
  const cupomFileRef = useRef<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (painelFileRef.current) {
      const compressed = await compressImage(painelFileRef.current);
      fd.set("painel_chegada", compressed, "foto.jpg");
    }
    if (cupomFileRef.current) {
      const compressed = await compressImage(cupomFileRef.current);
      fd.set("cupom", compressed, "cupom.jpg");
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

      {/* Informações de chegada */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Informações de chegada</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="km_chegada">Km de chegada</Label>
            <input
              type="number"
              id="km_chegada"
              name="km_chegada"
              required
              min={kmSaida}
              step="0.1"
              placeholder={String(kmSaida)}
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hora_chegada">Hora de chegada</Label>
            <input
              type="time"
              id="hora_chegada"
              name="hora_chegada"
              required
              defaultValue={horaAtual}
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>
        {kmSaida > 0 && (
          <p className="text-xs text-gray-400">
            Km registrado na saída:{" "}
            {kmSaida.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          </p>
        )}
      </div>

      {/* Foto do painel de chegada */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Foto do painel</h2>
        <p className="text-xs text-gray-500">
          Tire uma foto do painel mostrando a quilometragem de chegada.
        </p>
        {painelPreview && (
          <img
            src={painelPreview}
            alt="Preview do painel de chegada"
            className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
          />
        )}
        <label className="flex items-center justify-center gap-2 w-full h-10 rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-600 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
          <Camera className="w-4 h-4" />
          {painelPreview ? "Trocar foto" : "Tirar / selecionar foto"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                painelFileRef.current = f;
                setPainelPreview(URL.createObjectURL(f));
              }
            }}
          />
        </label>
      </div>

      {/* Abastecimento */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Abastecimento</h2>
          <button
            type="button"
            onClick={() => setAbasteceu((a) => !a)}
            className="flex items-center gap-2 select-none"
            aria-pressed={abasteceu}
          >
            <span className="text-sm text-gray-600">Abasteceu?</span>
            <div
              className={`relative w-10 h-6 rounded-full transition-colors ${
                abasteceu ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  abasteceu ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>
        <input type="hidden" name="abasteceu" value={abasteceu ? "1" : "0"} />

        {abasteceu && (
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="litros">Litros</Label>
                <input
                  type="number"
                  id="litros"
                  name="litros"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 30.5"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor (R$)</Label>
                <input
                  type="number"
                  id="valor"
                  name="valor"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 150.00"
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto do cupom de gasolina</Label>
              {cupomPreview && (
                <img
                  src={cupomPreview}
                  alt="Preview do cupom"
                  className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
                />
              )}
              <label className="flex items-center justify-center gap-2 w-full h-10 rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-600 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Camera className="w-4 h-4" />
                {cupomPreview ? "Trocar foto" : "Foto do cupom de gasolina"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      cupomFileRef.current = f;
                      setCupomPreview(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Concluindo vistoria..." : "Concluir vistoria"}
      </Button>
    </form>
  );
}
