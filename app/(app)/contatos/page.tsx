"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MoreHorizontal } from "lucide-react";

import { Topbar } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovoContatoDialog } from "@/components/app/contatos/novo-contato-dialog";
import {
  CONTATO_STATUS_LABEL,
  ORIGEM_LABEL,
  type Contato,
  type ContatoStatus,
} from "@/lib/types";
import { cn, formatBRL, formatDate, initials } from "@/lib/utils";

const STATUS_FILTERS: { id: ContatoStatus | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "lead", label: "Leads" },
  { id: "ativo", label: "Ativos" },
  { id: "cliente", label: "Clientes" },
  { id: "inativo", label: "Inativos" },
];

const STATUS_BADGE: Record<
  ContatoStatus,
  "default" | "won" | "open" | "progress"
> = {
  lead: "open",
  ativo: "progress",
  cliente: "won",
  inativo: "default",
};

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<ContatoStatus | "todos">("todos");

  useEffect(() => {
    fetch("/api/contatos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { contatos: [] }))
      .then(({ contatos: lista }) => setContatos(lista ?? []));
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter((c) => {
      const matchStatus = status === "todos" || c.status === status;
      const matchBusca =
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      return matchStatus && matchBusca;
    });
  }, [busca, status, contatos]);

  function aoCriar(contato: Contato) {
    setContatos((prev) => [...prev, contato]);
  }

  return (
    <>
      <Topbar
        title="Contatos"
        description={`${contatos.length} contatos na base`}
      />

      <div className="space-y-4 p-4 md:p-6">
        {/* Barra de ações */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, empresa ou e-mail"
              className="pl-8"
            />
          </label>
          <NovoContatoDialog onCriado={aoCriar} />
        </div>

        {/* Filtros por status */}
        <div className="flex flex-wrap gap-1 border-b border-border">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              aria-pressed={status === f.id}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                status === f.id
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="reveal overflow-hidden rounded-lg border border-border bg-card panel-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Valor estimado</TableHead>
                <TableHead>Último contato</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(c.nome)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{c.empresa}</p>
                    <p className="text-xs text-muted-foreground">{c.cargo}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[c.status]}>
                      {CONTATO_STATUS_LABEL[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ORIGEM_LABEL[c.origem]}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatBRL(c.valorEstimado)}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {formatDate(c.ultimoContato)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ações de ${c.nome}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem disabled>Criar negócio</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Arquivar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-1 p-12 text-center">
              <p className="text-sm font-medium">Nenhum contato encontrado</p>
              <p className="text-sm text-muted-foreground">
                Ajuste a busca ou os filtros para ver mais resultados.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
