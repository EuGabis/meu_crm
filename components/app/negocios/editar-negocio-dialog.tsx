"use client";

import { useEffect, useState, type FormEvent } from "react";

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
} from "@/components/ui/dialog";
import type { Negocio } from "@/lib/types";

export function EditarNegocioDialog({
  negocio,
  onOpenChange,
  onSalvo,
}: {
  negocio: Negocio | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: (negocio: Negocio) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [valor, setValor] = useState("");
  const [probabilidade, setProbabilidade] = useState("");
  const [fechamentoPrevisto, setFechamentoPrevisto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (negocio) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche o formulário quando o negócio selecionado muda
      setTitulo(negocio.titulo);
      setEmpresa(negocio.empresa);
      setValor(String(negocio.valor));
      setProbabilidade(String(negocio.probabilidade));
      setFechamentoPrevisto(negocio.fechamentoPrevisto?.slice(0, 10) ?? "");
      setErro(null);
    }
  }, [negocio]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!negocio) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/negocios/${negocio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          empresa,
          valor: Number(valor) || 0,
          probabilidade: Number(probabilidade) || 0,
          fechamentoPrevisto: fechamentoPrevisto || "",
        }),
      });
      if (!res.ok) throw new Error();
      const { negocio: atualizado } = await res.json();
      onSalvo(atualizado);
      onOpenChange(false);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={negocio !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar negócio</DialogTitle>
          <DialogDescription>
            Atualize os dados de {negocio?.titulo}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={salvar}>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-negocio-titulo">Título</Label>
            <Input
              id="edit-negocio-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-empresa">Empresa</Label>
              <Input
                id="edit-negocio-empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-valor">Valor (R$)</Label>
              <Input
                id="edit-negocio-valor"
                type="number"
                min="0"
                step="1"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-probabilidade">
                Probabilidade (%)
              </Label>
              <Input
                id="edit-negocio-probabilidade"
                type="number"
                min="0"
                max="100"
                step="5"
                value={probabilidade}
                onChange={(e) => setProbabilidade(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-negocio-fechamento">
                Previsão de fechamento
              </Label>
              <Input
                id="edit-negocio-fechamento"
                type="date"
                value={fechamentoPrevisto}
                onChange={(e) => setFechamentoPrevisto(e.target.value)}
              />
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
