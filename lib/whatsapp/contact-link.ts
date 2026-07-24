import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_DIGITOS = 8;

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

function telefonesBatem(a: string, b: string): boolean {
  const da = apenasDigitos(a);
  const db = apenasDigitos(b);
  if (da.length < MIN_DIGITOS || db.length < MIN_DIGITOS) return false;
  return da.endsWith(db) || db.endsWith(da);
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
