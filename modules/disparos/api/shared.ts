import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DbSettingsRow } from "../data/mapper";

export type { DbSettingsRow };

export interface DbGrupoLite {
  id: string;
  nome: string;
  identificador_grupo: string;
  ativo: boolean;
}

/** Lê a linha única de configuração de disparo; cria uma default se faltar. */
export async function lerOuCriarSettings(): Promise<DbSettingsRow> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("dispatch_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (data) return data as DbSettingsRow;

  const { data: criada, error } = await supabase
    .from("dispatch_settings")
    .insert({
      msgs_por_minuto: 10,
      msgs_por_hora: 200,
      intervalo_ms: 6000,
      pausado: false,
    })
    .select()
    .single();

  if (error) throw error;
  return criada as DbSettingsRow;
}
