import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/auth/current-user";
import { mapSettingsRow, type DbSettingsRow } from "../data/mapper";
import { lerOuCriarSettings } from "./shared";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const row = await lerOuCriarSettings();
    return NextResponse.json({ settings: mapSettingsRow(row) });
  } catch (error) {
    console.error("[disparos/settings/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as configurações." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (Number.isFinite(body.msgsPorMinuto) && body.msgsPorMinuto > 0) {
    patch.msgs_por_minuto = Math.floor(body.msgsPorMinuto);
  }
  if (Number.isFinite(body.msgsPorHora) && body.msgsPorHora > 0) {
    patch.msgs_por_hora = Math.floor(body.msgsPorHora);
  }
  if (Number.isFinite(body.intervaloMs) && body.intervaloMs >= 0) {
    patch.intervalo_ms = Math.floor(body.intervaloMs);
  }
  if (typeof body.pausado === "boolean") {
    patch.pausado = body.pausado;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }
  patch.atualizado_em = new Date().toISOString();

  try {
    const atual = await lerOuCriarSettings();
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("dispatch_settings")
      .update(patch)
      .eq("id", atual.id)
      .select()
      .single();

    if (error || !data) throw error;
    return NextResponse.json({ settings: mapSettingsRow(data as DbSettingsRow) });
  } catch (error) {
    console.error("[disparos/settings/patch]", error);
    return NextResponse.json(
      { error: "Não foi possível salvar as configurações." },
      { status: 500 }
    );
  }
}
