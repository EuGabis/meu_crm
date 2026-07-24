"use client";

import { useState } from "react";
import { UserPlus, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EQUIPE } from "@/lib/config-data";
import { PAPEL_LABEL, type Membro, type PapelEquipe } from "@/lib/types";
import { formatDate, initials } from "@/lib/utils";

export default function EquipePage() {
  const [membros, setMembros] = useState<Membro[]>(EQUIPE);

  function mudarPapel(id: string, papel: PapelEquipe) {
    setMembros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, papel } : m))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <header>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Equipe & permissões
          </h2>
          <p className="text-sm text-muted-foreground">
            {membros.length} membros · gerencie acessos e papéis.
          </p>
        </header>
        <Button variant="brand" className="gap-1.5">
          <UserPlus className="size-4" />
          Convidar
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {membros.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(m.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={m.papel}
                    onValueChange={(v) => mudarPapel(m.id, v as PapelEquipe)}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAPEL_LABEL) as PapelEquipe[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PAPEL_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={m.status === "ativo" ? "won" : "open"}>
                    {m.status === "ativo" ? "Ativo" : "Convite pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular text-muted-foreground">
                  {m.ultimoAcesso === "—" ? "—" : formatDate(m.ultimoAcesso)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Reenviar convite</DropdownMenuItem>
                      <DropdownMenuItem>Editar acesso</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        Remover da equipe
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que cada papel pode fazer</CardTitle>
          <CardDescription>
            Permissões aplicadas em todo o CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            {
              papel: "Administrador",
              desc: "Acesso total, incluindo configurações, integrações e faturamento.",
            },
            {
              papel: "Gestor",
              desc: "Vê tudo do comercial, gerencia pipeline e relatórios da equipe.",
            },
            {
              papel: "Vendedor",
              desc: "Gerencia os próprios contatos, negócios e conversas.",
            },
          ].map((r) => (
            <div
              key={r.papel}
              className="rounded-md border border-border bg-elevated p-3"
            >
              <p className="text-sm font-medium">{r.papel}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {r.desc}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
