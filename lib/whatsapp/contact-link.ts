import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_DIGITOS = 8;

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export function telefonesBatem(a: string, b: string): boolean {
  const da = apenasDigitos(a);
  const db = apenasDigitos(b);
  if (da.length < MIN_DIGITOS || db.length < MIN_DIGITOS) return false;
  return da.endsWith(db) || db.endsWith(da);
}

/**
 * Converte um telefone cadastrado em remote_jid do WhatsApp.
 * Assume números brasileiros: 10-11 dígitos ganham o prefixo 55.
 * Retorna null quando o telefone não se encaixa em nenhum padrão.
 */
export function normalizarParaJid(telefone: string): string | null {
  const d = apenasDigitos(telefone);
  if (d.length === 10 || d.length === 11) return `55${d}@s.whatsapp.net`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    return `${d}@s.whatsapp.net`;
  }
  return null;
}

/**
 * Encontra um contato cujo telefone bata com o número do WhatsApp
 * (comparação por sufixo de dígitos), ou cria um contato novo.
 * Retorna o id do contato.
 */
export async function resolveOrCreateContact(
  supabase: SupabaseClient,
  phoneNumber: string,
  displayName: string | null
): Promise<string> {
  const { data: candidatos, error: buscaError } = await supabase
    .from("contacts")
    .select("id, telefone")
    .order("criado_em", { ascending: true });

  if (buscaError) throw buscaError;

  const existente = (candidatos ?? []).find((c) =>
    telefonesBatem(c.telefone, phoneNumber)
  );
  if (existente) return existente.id;

  const { data: novo, error: criaError } = await supabase
    .from("contacts")
    .insert({
      nome: displayName?.trim() || phoneNumber,
      email: "",
      telefone: phoneNumber,
      origem: "whatsapp",
    })
    .select("id")
    .single();

  if (criaError) throw criaError;
  return novo.id;
}
