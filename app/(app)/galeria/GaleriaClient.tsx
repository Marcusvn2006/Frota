"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatBRT } from "@/lib/utils";
import type { TipoFoto } from "@/lib/types/database.types";

export type FotoItem = {
  id: string;
  tipo: TipoFoto;
  signedUrl: string;
  tirada_em: string;
};

export type UsoFotos = {
  checklistId: string;
  reservaId: string;
  veiculo: { modelo: string; placa: string };
  motorista: string;
  solicitante: string;
  inicio: string;
  km_saida: number | null;
  km_chegada: number | null;
  fotos: FotoItem[];
};

const TIPO_LABEL: Record<TipoFoto, string> = {
  painel_saida: "Saída",
  painel_chegada: "Chegada",
  cupom: "Gasolina",
};

type FiltroTipo = "" | "painel" | "gasolina";

function fotoMatchTipo(tipo: TipoFoto, filtro: FiltroTipo): boolean {
  if (filtro === "painel") return tipo === "painel_saida" || tipo === "painel_chegada";
  if (filtro === "gasolina") return tipo === "cupom";
  return true;
}

async function downloadFoto(url: string, tipo: TipoFoto, tirada_em: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const date = tirada_em.slice(0, 10);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${tipo}_${date}.jpg`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

function Lightbox({
  fotos,
  startIndex,
  onClose,
}: {
  fotos: FotoItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [downloading, setDownloading] = useState(false);
  const foto = fotos[idx];
  const hasPrev = idx > 0;
  const hasNext = idx < fotos.length - 1;

  const handleDownload = async () => {
    if (!foto.signedUrl) return;
    setDownloading(true);
    await downloadFoto(foto.signedUrl, foto.tipo, foto.tirada_em).catch(() => {});
    setDownloading(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pt-10 pb-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-white/80">
          {TIPO_LABEL[foto.tipo]} ·{" "}
          {formatBRT(foto.tirada_em, { dateStyle: "short", timeStyle: "short" })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-40"
            title="Baixar foto"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={foto.signedUrl}
          alt={TIPO_LABEL[foto.tipo]}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Navigation */}
      {fotos.length > 1 && (
        <div
          className="flex items-center justify-center gap-6 py-4 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIdx((i) => i - 1)}
            disabled={!hasPrev}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-xs text-white/60">
            {idx + 1} / {fotos.length}
          </span>
          <button
            onClick={() => setIdx((i) => i + 1)}
            disabled={!hasNext}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 disabled:opacity-30 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

function UsoCard({
  uso,
  onFotoClick,
  filtroTipo,
}: {
  uso: UsoFotos;
  onFotoClick: (fotos: FotoItem[], idx: number) => void;
  filtroTipo: FiltroTipo;
}) {
  const fotosFiltradas = uso.fotos.filter((f) => fotoMatchTipo(f.tipo, filtroTipo));

  const kmPercorridos =
    uso.km_chegada != null && uso.km_saida != null
      ? uso.km_chegada - uso.km_saida
      : null;

  const fmtKm = (n: number | null) =>
    n != null
      ? n.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "—";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{uso.veiculo.modelo}</p>
          <p className="text-xs font-mono text-gray-500">{uso.veiculo.placa}</p>
        </div>
        <p className="text-xs text-gray-400 shrink-0 text-right">
          {formatBRT(uso.inicio, { dateStyle: "short" })}
        </p>
      </div>

      {/* Info */}
      <div className="space-y-0.5 text-sm text-gray-600">
        <p>
          <span className="font-medium">Motorista:</span> {uso.motorista}
        </p>
        {uso.motorista !== uso.solicitante && (
          <p className="text-xs text-gray-400">Solicitado por {uso.solicitante}</p>
        )}
        {kmPercorridos != null && (
          <p className="text-xs text-gray-500">
            {fmtKm(uso.km_saida)} → {fmtKm(uso.km_chegada)} km ·{" "}
            <span className="font-medium">{fmtKm(kmPercorridos)} km percorridos</span>
          </p>
        )}
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-3 gap-2">
        {fotosFiltradas.map((foto, i) => (
          <button
            key={foto.id}
            onClick={() => onFotoClick(fotosFiltradas, i)}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 active:scale-95 transition-all"
          >
            {foto.signedUrl ? (
              <img
                src={foto.signedUrl}
                alt={TIPO_LABEL[foto.tipo]}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-[10px] text-gray-400">—</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
              <p className="text-[9px] text-white font-medium leading-tight">
                {TIPO_LABEL[foto.tipo]}
              </p>
            </div>
          </button>
        ))}
      </div>

      <Link
        href={`/checklist/${uso.reservaId}`}
        className="block text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        Ver vistoria completa →
      </Link>
    </div>
  );
}

interface Props {
  usos: UsoFotos[];
}

export function GaleriaClient({ usos }: Props) {
  const [lightbox, setLightbox] = useState<{
    fotos: FotoItem[];
    idx: number;
  } | null>(null);
  const [filtroCarro, setFiltroCarro] = useState("");
  const [filtroPessoa, setFiltroPessoa] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("");

  // Opções únicas para os selects
  const carros = Array.from(
    new Map(usos.map((u) => [`${u.veiculo.modelo} ${u.veiculo.placa}`, u.veiculo])).entries()
  ).map(([key, v]) => ({ key, modelo: v.modelo, placa: v.placa }));

  const pessoas = Array.from(new Set(usos.map((u) => u.motorista))).sort();

  const meses = Array.from(
    new Set(usos.map((u) => u.inicio.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const usosFiltrados = usos.filter((u) => {
    if (filtroCarro && `${u.veiculo.modelo} ${u.veiculo.placa}` !== filtroCarro) return false;
    if (filtroPessoa && u.motorista !== filtroPessoa) return false;
    if (filtroMes && !u.inicio.startsWith(filtroMes)) return false;
    if (filtroTipo && !u.fotos.some((f) => fotoMatchTipo(f.tipo, filtroTipo))) return false;
    return true;
  });

  const temFiltro = filtroCarro || filtroPessoa || filtroMes || filtroTipo;

  const selectClass =
    "h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-0 flex-1";

  if (usos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📷</p>
        <p className="font-medium text-gray-600">Nenhuma foto registrada</p>
        <p className="text-sm mt-1">As fotos aparecem após a conclusão das vistorias.</p>
      </div>
    );
  }

  return (
    <>
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2 mb-4">
        <div className="flex gap-2">
          <select
            value={filtroCarro}
            onChange={(e) => setFiltroCarro(e.target.value)}
            className={selectClass}
          >
            <option value="">Todos os carros</option>
            {carros.map((c) => (
              <option key={c.key} value={c.key}>
                {c.modelo} · {c.placa}
              </option>
            ))}
          </select>

          <select
            value={filtroPessoa}
            onChange={(e) => setFiltroPessoa(e.target.value)}
            className={selectClass}
          >
            <option value="">Todas as pessoas</option>
            {pessoas.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className={selectClass}
          >
            <option value="">Todos os meses</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {new Date(m + "-02").toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
            className={selectClass}
          >
            <option value="">Todos os tipos</option>
            <option value="painel">Painéis</option>
            <option value="gasolina">Gasolina</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          {filtroTipo === "gasolina" && (
            <p className="text-xs text-amber-600 font-medium">
              Mostrando apenas fotos de cupons de gasolina
            </p>
          )}
          {filtroTipo === "painel" && (
            <p className="text-xs text-blue-600 font-medium">
              Mostrando apenas fotos de painel
            </p>
          )}
          {!filtroTipo && <span />}

          {temFiltro && (
            <button
              onClick={() => {
                setFiltroCarro("");
                setFiltroPessoa("");
                setFiltroMes("");
                setFiltroTipo("");
              }}
              className="shrink-0 text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {temFiltro && (
          <p className="text-xs text-gray-400">
            {usosFiltrados.length} de {usos.length} vistoria{usos.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Lista */}
      {usosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium text-gray-500">Nenhuma vistoria encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {usosFiltrados.map((uso) => (
            <UsoCard
              key={uso.checklistId}
              uso={uso}
              filtroTipo={filtroTipo}
              onFotoClick={(fotos, idx) => setLightbox({ fotos, idx })}
            />
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          fotos={lightbox.fotos}
          startIndex={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
