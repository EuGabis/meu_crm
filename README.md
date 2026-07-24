# Meu CRM

CRM de vendas para gestão comercial completa — contatos, pipeline, atendimento e produtividade em um só lugar. Construído para uso interno e para ser clonado e customizado por cliente.

## Funcionalidades

- **Painel** — visão geral do comercial: receita, pipeline, conversão e atividades recentes.
- **Inbox (WhatsApp)** — conversas em caixa de entrada, com resposta manual e apoio de agentes.
- **Contatos** — base de contatos com busca, filtros por status e ações rápidas.
- **Pipeline** — kanban de negócios por etapa, com movimentação entre estágios.
- **Agenda** — visão de semana com reuniões e compromissos.
- **Tarefas & lembretes** — organizadas por prazo (atrasadas, hoje, próximas).
- **Metas & desempenho** — metas do time e por vendedor, com progresso e ritmo.
- **Relatórios** — funil de conversão, origem dos contatos e desempenho por vendedor.
- **Automações** — regras que disparam ações a partir de eventos.
- **Configurações** — conta, equipe & permissões, integrações e agentes de atendimento.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- Componentes acessíveis sobre [Radix UI](https://www.radix-ui.com)

> Nesta fase, o front-end consome dados de exemplo tipados em `lib/*-data.ts`.
> A camada de dados foi desenhada para ser substituída por um backend (Supabase)
> sem alterações na interface.

## Como rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando         | Descrição                   |
| --------------- | --------------------------- |
| `npm run dev`   | Ambiente de desenvolvimento |
| `npm run build` | Build de produção           |
| `npm run start` | Sobe o build de produção    |
| `npm run lint`  | Verificação de lint         |

## Estrutura

```
app/(app)/        Rotas da aplicação (painel, inbox, pipeline, agenda, ...)
components/ui/    Componentes de interface reutilizáveis
components/app/   Componentes de layout e de cada área
lib/              Tipos de domínio, utilitários e dados de exemplo
```

## Deploy

Pronto para deploy na [Vercel](https://vercel.com). Basta importar o repositório.
