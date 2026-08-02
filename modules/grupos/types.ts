/** Tipos do módulo de Grupos de WhatsApp (view-models). */

export interface Grupo {
  id: string;
  nome: string;
  identificadorGrupo: string; // JID (…@g.us)
  ativo: boolean;
  criadoEm: string; // ISO
}

/** Grupo trazido da Evolution API (ainda não necessariamente cadastrado). */
export interface GrupoEvolution {
  id: string; // JID
  nome: string;
  participantes: number | null;
  jaCadastrado: boolean;
}
