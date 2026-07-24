"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USUARIO_ATUAL } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

export default function ContaPage() {
  const [twoFA, setTwoFA] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Conta
        </h2>
        <p className="text-sm text-muted-foreground">
          Seus dados de perfil e segurança de acesso.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Como você aparece para a equipe e nos registros.
          </CardDescription>
        </CardHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 text-base">
                <AvatarFallback>{initials(USUARIO_ATUAL.nome)}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm">
                  Trocar foto
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  Remover
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" defaultValue={USUARIO_ATUAL.nome} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" defaultValue={USUARIO_ATUAL.email} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cargo">Cargo</Label>
                <Input id="cargo" defaultValue={USUARIO_ATUAL.cargo} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="empresa">Empresa</Label>
                <Input id="empresa" defaultValue="Minha Empresa" />
              </div>
              <div className="grid gap-1.5">
                <Label>Fuso horário</Label>
                <Select defaultValue="brt">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brt">(GMT-03:00) Brasília</SelectItem>
                    <SelectItem value="mao">(GMT-04:00) Manaus</SelectItem>
                    <SelectItem value="fen">
                      (GMT-02:00) Fernando de Noronha
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Idioma</Label>
                <Select defaultValue="pt">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português (Brasil)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
            <Button type="submit" variant="brand">
              Salvar alterações
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>
            Senha e verificação em duas etapas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input id="senha-atual" type="password" placeholder="••••••••" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="senha-nova">Nova senha</Label>
              <Input id="senha-nova" type="password" placeholder="••••••••" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-elevated p-3">
            <div className="pr-4">
              <p className="text-sm font-medium">Verificação em duas etapas</p>
              <p className="text-xs text-muted-foreground">
                Exige um código além da senha ao entrar. Recomendado.
              </p>
            </div>
            <Switch
              checked={twoFA}
              onCheckedChange={setTwoFA}
              aria-label="Ativar verificação em duas etapas"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="brand">Atualizar segurança</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
