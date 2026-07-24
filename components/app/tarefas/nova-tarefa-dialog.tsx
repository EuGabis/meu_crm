"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ATIVIDADE_LABEL,
  PRIORIDADE_LABEL,
  type Contato,
  type Prioridade,
  type Tarefa,
  type TipoAtividade,
} from "@/lib/types";

const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const TIPOS: TipoAtividade[] = ["ligacao", "email", "reuniao", "nota", "tarefa"];

export function NovaTarefaDialog({
  contatos,
  onCriada,
}: {
  contatos: Contato[];
  onCriada: (tarefa: Tarefa) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [vencimento, setVencimento] = useState("");
  const [tipo, setTipo] = useState<TipoAtividade>("tarefa");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    setTitulo("");
    setPrioridade("media");
    setVencimento("");
    setTipo("tarefa");
    setContatoId("");
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          prioridade,
          vencimento,
          tipo,
          contatoId: contatoId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { tarefa } = await res.json();
      onCriada(tarefa);
      limpar();
      setOpen(false);
    } catch {
      setErro("Não foi possível salvar a tarefa. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="brand" className="gap-1.5">
          <Plus className="size-4" />
          Nova tarefa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Cadastre uma tarefa ou lembrete.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="tarefa-titulo">Título</Label>
            <Input
              id="tarefa-titulo"
              placeholder="Ex: Ligar para o cliente"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-prioridade">Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as Prioridade)}
              >
                <SelectTrigger id="tarefa-prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-vencimento">Vencimento</Label>
              <Input
                id="tarefa-vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtividade)}>
                <SelectTrigger id="tarefa-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ATIVIDADE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tarefa-contato">Contato (opcional)</Label>
              <Select
                value={contatoId || "none"}
                onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="tarefa-contato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum contato</SelectItem>
                  {contatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
