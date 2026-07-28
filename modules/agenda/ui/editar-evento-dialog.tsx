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

function paraData(iso: string): string {
  return iso.slice(0, 10);
}
function paraHora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function paraDataHora(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00`).toISOString();
}

export function EditarEventoDialog({
  evento,
  contatos,
  onOpenChange,
  onSalvo,
  onExcluido,
}: {
  evento: EventoAgenda | null;
  contatos: Contato[];
  onOpenChange: (open: boolean) => void;
  onSalvo: (evento: EventoAgenda) => void;
  onExcluido: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [tipo, setTipo] = useState<EventoTipo>("reuniao");
  const [local, setLocal] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (evento) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando o evento selecionado muda
      setTitulo(evento.titulo);
      setData(paraData(evento.inicio));
      setHoraInicio(paraHora(evento.inicio));
      setHoraFim(paraHora(evento.fim));
      setTipo(evento.tipo);
      setLocal(evento.local);
      setContatoId(evento.contatoId ?? "");
      setErro(null);
    }
  }, [evento]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!evento) return;
    const inicio = paraDataHora(data, horaInicio);
    const fim = paraDataHora(data, horaFim);
    if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
      setErro("O fim precisa ser depois do início.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/eventos/${evento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          inicio,
          fim,
          tipo,
          local,
          contatoId: contatoId || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { evento: atualizado } = await res.json();
      onSalvo(atualizado);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function excluir() {
    if (!evento) return;
    if (!window.confirm(`Excluir "${evento.titulo}" permanentemente?`)) return;
    const res = await fetch(`/api/eventos/${evento.id}`, { method: "DELETE" });
    if (!res.ok) return;
    onExcluido(evento.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={evento !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription>Atualize os dados de {evento?.titulo}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-evento-titulo">Título</Label>
            <Input
              id="edit-evento-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-data">Data</Label>
              <Input
                id="edit-evento-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-inicio">Início</Label>
              <Input
                id="edit-evento-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-fim">Fim</Label>
              <Input
                id="edit-evento-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-evento-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as EventoTipo)}>
                <SelectTrigger id="edit-evento-tipo">
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
              <Label htmlFor="edit-evento-local">Local (opcional)</Label>
              <Input
                id="edit-evento-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-evento-contato">Contato (opcional)</Label>
            <Select
              value={contatoId || "none"}
              onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="edit-evento-contato">
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
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={excluir}
              >
                Excluir
              </Button>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" variant="brand" disabled={enviando}>
                  {enviando ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
