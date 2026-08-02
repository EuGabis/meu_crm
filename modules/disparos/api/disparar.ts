import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/auth/current-user";
import { sendGroupTextMessage } from "@/lib/evolution/client";
import type { DbSettingsRow, DbGrupoLite } from "./shared";
import { lerOuCriarSettings } from "./shared";
import type { DispatchResult } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ContentRow {
  id: string;
  tipo: string;
  texto: string;
  status: string;
}

/**
 * Envia um conteúdo (tipo whatsapp) aos grupos ativos do usuário.
 * Respeita a pausa de emergência e os limites por minuto/hora (§3.4).
 */
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const contentId = typeof body.contentId === "string" ? body.contentId : "";
  const groupIdsFiltro: string[] | null = Array.isArray(body.groupIds)
    ? body.groupIds.filter((x: unknown) => typeof x === "string")
    : null;

  if (!contentId) {
    return NextResponse.json(
      { error: "contentId é obrigatório." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // 1) Conteúdo
  const { data: content } = await supabase
    .from("contents")
    .select("id, tipo, texto, status")
    .eq("id", contentId)
    .maybeSingle();

  if (!content) {
    return NextResponse.json(
      { error: "Conteúdo não encontrado." },
      { status: 404 }
    );
  }
  const c = content as ContentRow;

  // Instagram NUNCA é enviado automaticamente (§2.2).
  if (c.tipo === "instagram") {
    return NextResponse.json(
      { error: "Conteúdo de Instagram não é enviado automaticamente." },
      { status: 400 }
    );
  }
  if (!c.texto?.trim()) {
    return NextResponse.json(
      { error: "Conteúdo sem texto para enviar." },
      { status: 400 }
    );
  }

  // 2) Pausa de emergência
  const settings = (await lerOuCriarSettings()) as DbSettingsRow;
  if (settings.pausado) {
    const result: DispatchResult = {
      enviados: 0,
      falhas: 0,
      total: 0,
      pausado: true,
    };
    return NextResponse.json(
      { error: "Envios pausados (pausa de emergência ativa).", result },
      { status: 423 }
    );
  }

  // 3) Grupos-alvo (ativos, do usuário; opcionalmente filtrados)
  let query = supabase
    .from("whatsapp_groups")
    .select("id, nome, identificador_grupo, ativo")
    .eq("user_id", userId)
    .eq("ativo", true);
  if (groupIdsFiltro && groupIdsFiltro.length > 0) {
    query = query.in("id", groupIdsFiltro);
  }
  const { data: gruposData } = await query;
  const grupos = (gruposData as DbGrupoLite[] | null) ?? [];

  if (grupos.length === 0) {
    return NextResponse.json(
      { error: "Nenhum grupo ativo para enviar." },
      { status: 400 }
    );
  }

  // 4) Orçamento pelos limites (conta envios recentes deste usuário)
  const todosGruposIds = await idsDosGruposDoUsuario(supabase, userId);
  const agora = Date.now();
  const enviadosUltimoMinuto = await contarEnviados(
    supabase,
    todosGruposIds,
    new Date(agora - 60_000).toISOString()
  );
  const enviadosUltimaHora = await contarEnviados(
    supabase,
    todosGruposIds,
    new Date(agora - 3_600_000).toISOString()
  );

  const restaMinuto = Math.max(0, settings.msgs_por_minuto - enviadosUltimoMinuto);
  const restaHora = Math.max(0, settings.msgs_por_hora - enviadosUltimaHora);
  const orcamento = Math.min(grupos.length, restaMinuto, restaHora);

  if (orcamento <= 0) {
    return NextResponse.json(
      {
        error:
          "Limite de envios atingido. Aguarde antes de disparar novamente.",
        result: { enviados: 0, falhas: 0, total: grupos.length, pausado: false },
      },
      { status: 429 }
    );
  }

  // 5) Envio sequencial com intervalo entre mensagens
  const alvo = grupos.slice(0, orcamento);
  let enviados = 0;
  let falhas = 0;

  for (let i = 0; i < alvo.length; i++) {
    const g = alvo[i];
    try {
      await sendGroupTextMessage(g.identificador_grupo, c.texto);
      await supabase.from("dispatch_log").insert({
        content_id: c.id,
        group_id: g.id,
        status: "enviado",
      });
      enviados++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[disparos/enviar]", g.identificador_grupo, msg);
      await supabase.from("dispatch_log").insert({
        content_id: c.id,
        group_id: g.id,
        status: "falhou",
        erro: msg.slice(0, 500),
      });
      falhas++;
    }
    if (i < alvo.length - 1 && settings.intervalo_ms > 0) {
      await sleep(settings.intervalo_ms);
    }
  }

  // 6) Marca o conteúdo como enviado se houve ao menos um sucesso
  if (enviados > 0) {
    await supabase
      .from("contents")
      .update({ status: "enviado" })
      .eq("id", c.id);
  }

  const result: DispatchResult = {
    enviados,
    falhas,
    total: grupos.length,
    pausado: false,
  };
  return NextResponse.json({ result });
}

// --- helpers ---------------------------------------------------------------

async function idsDosGruposDoUsuario(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("whatsapp_groups")
    .select("id")
    .eq("user_id", userId);
  return ((data as { id: string }[] | null) ?? []).map((g) => g.id);
}

async function contarEnviados(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  groupIds: string[],
  desdeISO: string
): Promise<number> {
  if (groupIds.length === 0) return 0;
  const { count } = await supabase
    .from("dispatch_log")
    .select("id", { count: "exact", head: true })
    .in("group_id", groupIds)
    .eq("status", "enviado")
    .gte("enviado_em", desdeISO);
  return count ?? 0;
}
