"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MetaConfig } from "@/lib/types";

export function DefinirMetaDialog({ meta }: { meta: MetaConfig }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receita, setReceita] = useState(String(meta.alvoReceita || ""));
  const [negocios, setNegocios] = useState(String(meta.alvoNegocios || ""));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/metas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alvoReceita: Number(receita) || 0,
          alvoNegocios: Number(negocios) || 0,
        }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error ?? "Falha ao salvar a meta.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar a meta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Target className="size-4" />
          Definir meta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta do time</DialogTitle>
          <DialogDescription>
            Defina o alvo de receita (e, opcionalmente, de negócios fechados).
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="alvo-receita">Meta de receita (R$)</Label>
            <Input
              id="alvo-receita"
              type="number"
              min={0}
              step={1000}
              placeholder="Ex.: 100000"
              value={receita}
              onChange={(e) => setReceita(e.target.value)}
              className="tabular"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="alvo-negocios">Meta de negócios (opcional)</Label>
            <Input
              id="alvo-negocios"
              type="number"
              min={0}
              step={1}
              placeholder="Ex.: 10"
              value={negocios}
              onChange={(e) => setNegocios(e.target.value)}
              className="tabular"
            />
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
