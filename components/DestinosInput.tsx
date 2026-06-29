"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DestinosInputProps {
  initial?: string[];
}

export function DestinosInput({ initial = [""] }: DestinosInputProps) {
  const [destinos, setDestinos] = useState<string[]>(
    initial.length > 0 ? initial : [""]
  );

  function add() {
    setDestinos((prev) => [...prev, ""]);
  }

  function remove(i: number) {
    if (destinos.length <= 1) return;
    setDestinos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function update(i: number, value: string) {
    setDestinos((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {destinos.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            name={`destino_${i}`}
            value={d}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Destino ${i + 1}`}
            required={i === 0}
          />
          {destinos.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar destino
      </button>
    </div>
  );
}
