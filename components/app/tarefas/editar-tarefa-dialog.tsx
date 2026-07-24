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

export function EditarTarefaDialog({
  tarefa,
  contatos,
  onOpenChange,
  onSalvo,
}: {
  tarefa: Tarefa | null;
  contatos: Contato[];
  onOpenChange: (open: boolean) => void;
  onSalvo: (tarefa: Tarefa) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [vencimento, setVencimento] = useState("");
  const [tipo, setTipo] = useState<TipoAtividade>("tarefa");
  const [contatoId, setContatoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (tarefa) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando a tarefa selecionada muda
      setTitulo(tarefa.titulo);
      setPrioridade(tarefa.prioridade);
      setVencimento(tarefa.vencimento);
      setTipo(tarefa.tipo);
      setContatoId(tarefa.contatoId ?? "");
      setErro(null);
    }
  }, [tarefa]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!tarefa) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/tarefas/${tarefa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          prioridade,
          vencimento,
          tipo,
          contatoId: contatoId || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { tarefa: atualizada } = await res.json();
      onSalvo(atualizada);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={tarefa !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarefa</DialogTitle>
          <DialogDescription>Atualize os dados de {tarefa?.titulo}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-tarefa-titulo">Título</Label>
            <Input
              id="edit-tarefa-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tarefa-prioridade">Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as Prioridade)}
              >
                <SelectTrigger id="edit-tarefa-prioridade">
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
              <Label htmlFor="edit-tarefa-vencimento">Vencimento</Label>
              <Input
                id="edit-tarefa-vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-tarefa-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtividade)}>
                <SelectTrigger id="edit-tarefa-tipo">
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
              <Label htmlFor="edit-tarefa-contato">Contato (opcional)</Label>
              <Select
                value={contatoId || "none"}
                onValueChange={(v) => setContatoId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="edit-tarefa-contato">
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
              {enviando ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
