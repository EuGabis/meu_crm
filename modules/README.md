# Módulos

Cada área do CRM é um **módulo autocontido** que se conecta aos outros
apenas por interfaces públicas. O objetivo: poder entender, alterar, testar
e (no futuro) ligar/desligar cada módulo isoladamente.

## Estrutura de um módulo

```
modules/<feature>/
  index.ts        # PORTA PÚBLICA — o único ponto por onde os outros importam
  types.ts        # tipos específicos do módulo (view-models, enums locais)
  data/           # mappers de linha do banco e queries do Supabase
  api/            # lógica dos Route Handlers (GET/POST/PATCH/DELETE)
  ui/             # componentes e a página do módulo
```

## Regras de conexão

1. **Importe só pela porta pública.** De fora, use `@/modules/<feature>`
   (o `index.ts`). Nunca importe subpastas de outro módulo direto.
2. **Roteamento fica fino em `app/`.** O Next exige os arquivos em `app/`,
   então cada `page.tsx` / `route.ts` é só um re-export do módulo:
   ```ts
   // app/(app)/agenda/page.tsx
   export { AgendaPage as default } from "@/modules/agenda";
   // app/api/eventos/route.ts
   export { GET, POST } from "@/modules/agenda/api/eventos";
   ```
3. **O que é compartilhado NÃO vira módulo.** Continua no lugar:
   - `components/ui/*` — design system (kit de UI)
   - `lib/supabase/*` — clients do Supabase
   - `lib/utils.ts` — utilitários (`cn`, `formatBRL`, …)
   - `lib/types.ts` — **entidades de domínio cross-módulo** (`Contato`,
     `Negocio`, `Usuario`, `EventoAgenda`, row types). Vários módulos as usam,
     então elas são "domínio compartilhado", não donas de um módulo só.
4. **Migração sem quebrar.** Ao mover um tipo para um módulo, deixe um
   re-export no caminho antigo (shim) até todos os consumidores serem
   atualizados. Ex.: `lib/agenda-data.ts` → `export * from "@/modules/agenda/types"`.

## Módulos

| Módulo   | Estado                    |
| -------- | ------------------------- |
| `agenda` | ✅ migrado (piloto)        |
| outros   | ⏳ a migrar (mesmo padrão) |
