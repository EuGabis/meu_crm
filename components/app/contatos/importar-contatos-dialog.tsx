"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTATO_STATUS_LABEL,
  ORIGEM_LABEL,
  type Contato,
  type ContatoStatus,
  type Origem,
} from "@/lib/types";

/** Valor sentinela do Select para "nenhuma coluna" (Radix não aceita value=""). */
const NENHUM = "__none__";

type Etapa = "upload" | "mapear" | "resultado";

type Planilha = {
  arquivo: string;
  colunas: string[];
  linhas: string[][];
};

type Mapa = {
  nome1: string; // índice de coluna (string) ou NENHUM
  nome2: string;
  empresa: string;
  telefone: string;
  email: string;
  cargo: string;
  observacoes: number[]; // índices de coluna incluídos nas observações
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Acha a linha de cabeçalho: a que tem mais células de texto preenchidas. */
function detectarCabecalho(linhas: string[][]): number {
  let melhor = 0;
  let maxPreenchidas = -1;
  const limite = Math.min(linhas.length, 15);
  for (let i = 0; i < limite; i += 1) {
    const preenchidas = linhas[i].filter((c) => String(c).trim() !== "").length;
    if (preenchidas > maxPreenchidas) {
      maxPreenchidas = preenchidas;
      melhor = i;
    }
  }
  return melhor;
}

function acharColuna(colunas: string[], termos: string[]): string {
  for (let i = 0; i < colunas.length; i += 1) {
    const n = normalizar(colunas[i]);
    if (termos.some((t) => n.includes(t))) return String(i);
  }
  return NENHUM;
}

/** Auto-mapeia colunas da planilha para os campos do contato. */
function autoMapear(colunas: string[]): Mapa {
  const nicho = acharColuna(colunas, ["nicho", "segmento", "categoria"]);
  const empresa = acharColuna(colunas, [
    "empresa",
    "razao",
    "estabelecimento",
    "negocio",
  ]);
  const nomePessoa = acharColuna(colunas, ["nome", "contato", "cliente", "responsavel"]);
  // Telefone: prioriza colunas de fone; evita casar com "Link WhatsApp" (URL).
  let telefone = acharColuna(colunas, ["telefone", "celular", "fone", "tel"]);
  if (telefone === NENHUM) telefone = acharColuna(colunas, ["whatsapp"]);
  const email = acharColuna(colunas, ["email", "e-mail"]);
  const cargo = acharColuna(colunas, ["cargo", "funcao"]);

  // Nome = Nicho — Empresa quando ambos existem; senão nome de pessoa; senão empresa.
  let nome1 = NENHUM;
  let nome2 = NENHUM;
  if (nicho !== NENHUM && empresa !== NENHUM) {
    nome1 = nicho;
    nome2 = empresa;
  } else if (nomePessoa !== NENHUM) {
    nome1 = nomePessoa;
  } else if (empresa !== NENHUM) {
    nome1 = empresa;
  }

  const usadas = new Set(
    [nome1, nome2, empresa, telefone, email, cargo]
      .filter((v) => v !== NENHUM)
      .map(Number)
  );
  const observacoes = colunas
    .map((_, i) => i)
    .filter((i) => !usadas.has(i) && normalizar(colunas[i]) !== "");

  return { nome1, nome2, empresa, telefone, email, cargo, observacoes };
}

/** Select de "qual coluna da planilha alimenta este campo". */
function ColunaSelect({
  colunas,
  valor,
  onChange,
}: {
  colunas: string[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecionar coluna" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUM}>— nenhuma —</SelectItem>
        {colunas.map((c, i) => (
          <SelectItem key={i} value={String(i)}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function montarContatos(
  planilha: Planilha,
  mapa: Mapa
): { validos: Record<string, string>[]; ignorados: number } {
  const cel = (linha: string[], idx: string): string =>
    idx === NENHUM ? "" : String(linha[Number(idx)] ?? "").trim();

  const validos: Record<string, string>[] = [];
  let ignorados = 0;

  for (const linha of planilha.linhas) {
    const nome = [cel(linha, mapa.nome1), cel(linha, mapa.nome2)]
      .filter(Boolean)
      .join(" — ");

    if (!nome) {
      ignorados += 1;
      continue;
    }

    const observacoes = mapa.observacoes
      .map((i) => {
        const valor = String(linha[i] ?? "").trim();
        return valor ? `${planilha.colunas[i]}: ${valor}` : "";
      })
      .filter(Boolean)
      .join("\n");

    validos.push({
      nome,
      empresa: cel(linha, mapa.empresa),
      telefone: cel(linha, mapa.telefone),
      email: cel(linha, mapa.email),
      cargo: cel(linha, mapa.cargo),
      observacoes,
    });
  }

  return { validos, ignorados };
}

export function ImportarContatosDialog({
  onImportado,
}: {
  onImportado: (contatos: Contato[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [linhaCabecalho, setLinhaCabecalho] = useState(0);
  const [linhasBrutas, setLinhasBrutas] = useState<string[][]>([]);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [status, setStatus] = useState<ContatoStatus>("lead");
  const [origem, setOrigem] = useState<Origem>("outbound");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ criados: number; ignorados: number } | null>(
    null
  );

  function resetar() {
    setEtapa("upload");
    setPlanilha(null);
    setLinhasBrutas([]);
    setLinhaCabecalho(0);
    setMapa(null);
    setStatus("lead");
    setOrigem("outbound");
    setErro(null);
    setResultado(null);
    setEnviando(false);
  }

  /** Reconstrói colunas/linhas a partir da linha de cabeçalho escolhida. */
  function aplicarCabecalho(linhas: string[][], idxCabecalho: number) {
    const colunas = (linhas[idxCabecalho] ?? []).map((c, i) => {
      const t = String(c ?? "").trim();
      return t || `Coluna ${i + 1}`;
    });
    const dados = linhas
      .slice(idxCabecalho + 1)
      .filter((l) => l.some((c) => String(c).trim() !== ""));
    const nova: Planilha = { arquivo: planilha?.arquivo ?? "", colunas, linhas: dados };
    setPlanilha(nova);
    setMapa(autoMapear(colunas));
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });
      if (linhas.length === 0) {
        setErro("A planilha está vazia.");
        return;
      }
      const idx = detectarCabecalho(linhas);
      setPlanilha({ arquivo: file.name, colunas: [], linhas: [] });
      setLinhasBrutas(linhas);
      setLinhaCabecalho(idx);
      aplicarCabecalho(linhas, idx);
      setEtapa("mapear");
    } catch {
      setErro("Não foi possível ler o arquivo. Use um .xlsx ou .csv válido.");
    } finally {
      e.target.value = "";
    }
  }

  function mudarCabecalho(novoIdx: number) {
    setLinhaCabecalho(novoIdx);
    aplicarCabecalho(linhasBrutas, novoIdx);
  }

  const previa = useMemo(() => {
    if (!planilha || !mapa) return null;
    return montarContatos(planilha, mapa);
  }, [planilha, mapa]);

  async function importar() {
    if (!previa || previa.validos.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/contatos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contatos: previa.validos, status, origem }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error ?? "Falha na importação.");
      onImportado(dados.contatos ?? []);
      setResultado({
        criados: dados.criados ?? 0,
        ignorados: (dados.ignorados ?? 0) + previa.ignorados,
      });
      setEtapa("resultado");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na importação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetar();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Upload className="size-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar contatos</DialogTitle>
          <DialogDescription>
            Envie uma planilha (.xlsx ou .csv). Confira o mapeamento das colunas e importe.
          </DialogDescription>
        </DialogHeader>

        {etapa === "upload" ? (
          <div className="grid gap-4 py-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong p-10 text-center transition-colors hover:bg-muted">
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">Clique para escolher um arquivo</span>
              <span className="text-xs text-muted-foreground">Formatos: .xlsx, .xls, .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={aoEscolherArquivo}
              />
            </label>
            {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          </div>
        ) : null}

        {etapa === "mapear" && planilha ? (
          <div className="grid gap-5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{planilha.arquivo}</span> ·{" "}
                {planilha.linhas.length} linhas
              </span>
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Linha do cabeçalho</span>
                <input
                  type="number"
                  min={1}
                  max={linhasBrutas.length}
                  value={linhaCabecalho + 1}
                  onChange={(e) => mudarCabecalho(Math.max(0, Number(e.target.value) - 1))}
                  className="h-8 w-16 rounded-md border border-input bg-surface px-2 text-sm"
                />
              </label>
            </div>

            {/* Mapeamento dos campos */}
            <div className="grid gap-3">
              <p className="text-sm font-medium">Mapeamento das colunas</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Nome (parte 1)</Label>
                  <ColunaSelect
                    colunas={planilha.colunas}
                    valor={mapa!.nome1}
                    onChange={(v) => setMapa({ ...mapa!, nome1: v })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Nome (parte 2, opcional)</Label>
                  <ColunaSelect
                    colunas={planilha.colunas}
                    valor={mapa!.nome2}
                    onChange={(v) => setMapa({ ...mapa!, nome2: v })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Empresa</Label>
                  <ColunaSelect
                    colunas={planilha.colunas}
                    valor={mapa!.empresa}
                    onChange={(v) => setMapa({ ...mapa!, empresa: v })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Telefone</Label>
                  <ColunaSelect
                    colunas={planilha.colunas}
                    valor={mapa!.telefone}
                    onChange={(v) => setMapa({ ...mapa!, telefone: v })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>E-mail (opcional)</Label>
                  <ColunaSelect
                    colunas={planilha.colunas}
                    valor={mapa!.email}
                    onChange={(v) => setMapa({ ...mapa!, email: v })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cargo (opcional)</Label>
                  <ColunaSelect
                    colunas={planilha.colunas}
                    valor={mapa!.cargo}
                    onChange={(v) => setMapa({ ...mapa!, cargo: v })}
                  />
                </div>
              </div>
              {mapa!.nome2 !== NENHUM ? (
                <p className="text-xs text-muted-foreground">
                  O nome será montado como “Parte 1 — Parte 2”.
                </p>
              ) : null}
            </div>

            {/* Observações */}
            <div className="grid gap-2">
              <p className="text-sm font-medium">
                Guardar nas Observações{" "}
                <span className="font-normal text-muted-foreground">
                  (colunas restantes)
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {planilha.colunas.map((c, i) => {
                  const ativa = mapa!.observacoes.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setMapa({
                          ...mapa!,
                          observacoes: ativa
                            ? mapa!.observacoes.filter((x) => x !== i)
                            : [...mapa!.observacoes, i].sort((a, b) => a - b),
                        })
                      }
                      aria-pressed={ativa}
                      className={
                        ativa
                          ? "rounded-full border border-brand bg-brand/10 px-2.5 py-1 text-xs font-medium text-foreground"
                          : "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-border-strong"
                      }
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Padrões do lote */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Status inicial</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ContatoStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONTATO_STATUS_LABEL) as ContatoStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {CONTATO_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Origem</Label>
                <Select value={origem} onValueChange={(v) => setOrigem(v as Origem)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ORIGEM_LABEL) as Origem[]).map((o) => (
                      <SelectItem key={o} value={o}>
                        {ORIGEM_LABEL[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prévia */}
            {previa ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">
                  Prévia ·{" "}
                  <span className="text-brand">{previa.validos.length}</span> contatos
                  {previa.ignorados > 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {previa.ignorados} sem nome (ignorados)
                    </span>
                  ) : null}
                </p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">Empresa</th>
                        <th className="px-3 py-2 font-medium">Telefone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.validos.slice(0, 5).map((c, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2">{c.nome}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.empresa}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.telefone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetar}>
                Trocar arquivo
              </Button>
              <Button
                type="button"
                variant="brand"
                disabled={enviando || !previa || previa.validos.length === 0}
                onClick={importar}
              >
                {enviando
                  ? "Importando…"
                  : `Importar ${previa?.validos.length ?? 0} contatos`}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {etapa === "resultado" && resultado ? (
          <div className="grid gap-4 py-4 text-center">
            <p className="text-2xl font-semibold text-brand">
              {resultado.criados} contatos importados
            </p>
            {resultado.ignorados > 0 ? (
              <p className="text-sm text-muted-foreground">
                {resultado.ignorados} linhas foram ignoradas por não terem nome.
              </p>
            ) : null}
            <DialogFooter className="justify-center">
              <Button
                type="button"
                variant="brand"
                onClick={() => {
                  setOpen(false);
                  resetar();
                }}
              >
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
