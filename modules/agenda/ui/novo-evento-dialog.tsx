"use client";

import { useEffect, useState, type FormEvent } from "react";

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
} from "@/components/ui/dialog";
import { TIPO_LABEL, type EventoTipo } from "../types";
import type { Contato, EventoAgenda } from "@/lib/types";

const TIPOS: EventoTipo[] = ["reuniao", "call", "tarefa", "pessoal"];

function paraDataHora(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00`).toISOString();
}

function hojeISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function NovoEventoDialog({
  open,
  onOpenChange,
  contatos,
  diaSelecionado,
  contatoInicialId,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contatos: Contato[];
  diaSelecionado: Date;
  contatoInicialId?: string;
  onCriado: (evento: EventoAgenda) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [tipo, setTipo] = useState<EventoTipo>("reuniao");
  const [local, setLocal] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o formulário toda vez que o diálogo abre
      setTitulo("");
      setData(hojeISO(diaSelecionado));
      setHoraInicio("09:00");
      setHoraFim("10:00");
      setTipo("reuniao");
      setLocal("");
      setContatoId(contatoInicialId ?? "");
      setErro(null);
    }
  }, [open, diaSelecionado, contatoInicialId]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const inicio = paraDataHora(data, horaInicio);
    const fim = paraDataHora(data, horaFim);
    if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
      setErro("O fim precisa ser depois do início.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          inicio,
          fim,
          tipo,
          local,
          contatoId: contatoId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { evento } = await res.json();
      onCriado(evento);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar o evento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
          <DialogDescription>Cadastre uma reunião ou compromisso.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="evento-titulo">Título</Label>
            <Input
              id="evento-titulo"
              placeholder="Ex: Demo com cliente"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="evento-data">Data</Label>
              <Input
                id="evento-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="evento-inicio">Início</Label>
              <Input
                id="evento-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="evento-fim">Fim</Label>
              <Input
                id="evento-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="evento-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as EventoTipo)}>
                <SelectTrigger id="evento-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="evento-local">Local (opcional)</Label>
              <Input
                id="evento-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="evento-contato">Contato (opcional)</Label>
            <Select
              value={contatoId || "none"}
              onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="evento-contato">
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
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
