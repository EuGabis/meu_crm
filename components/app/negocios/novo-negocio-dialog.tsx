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
import type { Contato, Negocio } from "@/lib/types";

export function NovoNegocioDialog({
  open,
  onOpenChange,
  contatos,
  contatoFixo,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contatos: Contato[];
  contatoFixo?: Contato;
  onCriado: (negocio: Negocio) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [valor, setValor] = useState("");
  const [fechamentoPrevisto, setFechamentoPrevisto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Depende do id (não do objeto) — o objeto muda de referência a cada
  // polling da página, o que resetaria o formulário no meio da digitação.
  const contatoFixoId = contatoFixo?.id ?? "";
  const contatoFixoEmpresa = contatoFixo?.empresa ?? "";

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o formulário toda vez que o diálogo abre
      setTitulo("");
      setContatoId(contatoFixoId);
      setEmpresa(contatoFixoEmpresa);
      setValor("");
      setFechamentoPrevisto("");
      setErro(null);
    }
  }, [open, contatoFixoId, contatoFixoEmpresa]);

  function selecionarContato(id: string) {
    setContatoId(id);
    const contato = contatos.find((c) => c.id === id);
    if (contato) setEmpresa(contato.empresa);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!contatoId) {
      setErro("Escolha um contato.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/negocios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          contatoId,
          empresa,
          valor: Number(valor) || 0,
          fechamentoPrevisto: fechamentoPrevisto || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { negocio } = await res.json();
      onCriado(negocio);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar o negócio. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const semContatos = !contatoFixo && contatos.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo negócio</DialogTitle>
          <DialogDescription>
            Cadastre um negócio vinculado a um contato.
          </DialogDescription>
        </DialogHeader>
        {semContatos ? (
          <p className="text-sm text-muted-foreground">
            Cadastre um contato antes de criar um negócio.
          </p>
        ) : (
          <form className="grid gap-4" onSubmit={salvar}>
            <div className="grid gap-1.5">
              <Label htmlFor="negocio-titulo">Título</Label>
              <Input
                id="negocio-titulo"
                placeholder="Ex: Plano Pro anual"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="negocio-contato">Contato</Label>
              {contatoFixo ? (
                <Input id="negocio-contato" value={contatoFixo.nome} disabled />
              ) : (
                <Select value={contatoId} onValueChange={selecionarContato}>
                  <SelectTrigger id="negocio-contato">
                    <SelectValue placeholder="Escolha um contato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} — {c.empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="negocio-empresa">Empresa</Label>
                <Input
                  id="negocio-empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="negocio-valor">Valor (R$)</Label>
                <Input
                  id="negocio-valor"
                  type="number"
                  min="0"
                  step="1"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="negocio-fechamento">
                Previsão de fechamento (opcional)
              </Label>
              <Input
                id="negocio-fechamento"
                type="date"
                value={fechamentoPrevisto}
                onChange={(e) => setFechamentoPrevisto(e.target.value)}
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
                {enviando ? "Salvando…" : "Salvar negócio"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
