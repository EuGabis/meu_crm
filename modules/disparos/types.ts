/** Tipos do módulo de Disparos (view-models). */

export interface DispatchSettings {
  msgsPorMinuto: number;
  msgsPorHora: number;
  intervaloMs: number;
  pausado: boolean;
  atualizadoEm: string; // ISO
}

export type DispatchStatus = "enviado" | "falhou" | "pausado";

/** Uma linha do histórico de disparo (para a UI). */
export interface DispatchLogItem {
  id: string;
  contentId: string;
  groupId: string;
  grupoNome: string;
  enviadoEm: string; // ISO
  status: DispatchStatus;
  erro: string | null;
}

/** Resultado de um disparo (retorno do POST /api/disparos). */
export interface DispatchResult {
  enviados: number;
  falhas: number;
  total: number;
  pausado: boolean;
}
