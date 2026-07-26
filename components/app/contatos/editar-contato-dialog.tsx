"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Contato } from "@/lib/types";

export function EditarContatoDialog({
  contato,
  onOpenChange,
  onSalvo,
}: {
  contato: Contato | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: (contato: Contato) => void;
}) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (contato) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando o contato selecionado muda
      setNome(contato.nome);
      setEmpresa(contato.empresa);
      setEmail(contato.email);
      setTelefone(contato.telefone);
      setCargo(contato.cargo);
      setObservacoes(contato.observacoes ?? "");
      setErro(null);
    }
  }, [contato]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!contato) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/contatos/${contato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, empresa, email, telefone, cargo, observacoes }),
      });
      if (!res.ok) throw new Error();
      const { contato: atualizado } = await res.json();
      onSalvo(atualizado);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={contato !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar contato</DialogTitle>
          <DialogDescription>
            Atualize os dados de {contato?.nome}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-empresa">Empresa</Label>
              <Input
                id="edit-empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">E-mail (opcional)</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-cargo">Cargo</Label>
            <Input
              id="edit-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-observacoes">Observações</Label>
            <Textarea
              id="edit-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
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
              {enviando ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
