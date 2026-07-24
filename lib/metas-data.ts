import type { Meta } from "@/lib/types";

/**
 * Metas mock do mês. "realizado" reflete o desempenho até agora (dia 24 de 31).
 * Fração do mês decorrida ≈ 24/31 = 77% → serve de base para o "ritmo".
 */

export const FRACAO_MES = 24 / 31;

export const METAS: Meta[] = [
  {
    id: "meta-u1",
    usuarioId: "u1",
    alvoReceita: 200000,
    realizadoReceita: 168000,
    alvoNegocios: 12,
    realizadoNegocios: 9,
  },
  {
    id: "meta-u2",
    usuarioId: "u2",
    alvoReceita: 90000,
    realizadoReceita: 52000,
    alvoNegocios: 8,
    realizadoNegocios: 4,
  },
  {
    id: "meta-u3",
    usuarioId: "u3",
    alvoReceita: 160000,
    realizadoReceita: 151000,
    alvoNegocios: 10,
    realizadoNegocios: 8,
  },
];
