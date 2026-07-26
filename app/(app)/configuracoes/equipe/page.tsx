"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovoUsuarioDialog } from "@/components/app/equipe/novo-usuario-dialog";
import type { UsuarioAcesso } from "@/lib/types";
import { formatDate, initials } from "@/lib/utils";

export default function EquipePage() {
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usuarios", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(({ usuarios: lista }) => setUsuarios(lista ?? []))
      .catch(() => setErro("Não foi possível carregar os usuários."))
      .finally(() => setCarregando(false));
  }, []);

  function aoCriar(usuario: UsuarioAcesso) {
    setUsuarios((prev) =>
      [...prev, usuario].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    );
  }

  async function remover(usuario: UsuarioAcesso) {
    if (!window.confirm(`Remover o acesso de ${usuario.nome}?`)) return;
    const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      window.alert(error ?? "Não foi possível remover o acesso.");
      return;
    }
    setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <header>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Equipe & acessos
          </h2>
          <p className="text-sm text-muted-foreground">
            {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"} com
            acesso ao CRM.
          </p>
        </header>
        <NovoUsuarioDialog onCriado={aoCriar} />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(u.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.confirmado ? "won" : "open"}>
                    {u.confirmado ? "Ativo" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular text-muted-foreground">
                  {formatDate(u.criadoEm)}
                </TableCell>
                <TableCell className="tabular text-muted-foreground">
                  {u.ultimoAcesso ? formatDate(u.ultimoAcesso) : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => remover(u)}
                      >
                        Remover acesso
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {carregando ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : null}
        {!carregando && erro ? (
          <div className="p-8 text-center text-sm text-destructive">{erro}</div>
        ) : null}
        {!carregando && !erro && usuarios.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum usuário ainda. Crie o primeiro acesso.
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" />
            Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nesta versão, todo usuário com acesso enxerga o CRM inteiro. Papéis
            (administrador, gestor, vendedor) com permissões separadas entram numa
            próxima etapa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
