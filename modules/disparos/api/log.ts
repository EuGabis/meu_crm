import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/auth/current-user";
import { mapDispatchLogRow, type DbDispatchLogRow } from "../data/mapper";

/** Histórico recente de disparos do usuário (join com o nome do grupo). */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  // Restringe aos grupos do usuário.
  const { data: gruposData } = await supabase
    .from("whatsapp_groups")
    .select("id")
    .eq("user_id", userId);
  const ids = ((gruposData as { id: string }[] | null) ?? []).map((g) => g.id);

  if (ids.length === 0) {
    return NextResponse.json({ log: [] });
  }

  const { data, error } = await supabase
    .from("dispatch_log")
    .select("id, content_id, group_id, enviado_em, status, erro, whatsapp_groups(nome)")
    .in("group_id", ids)
    .order("enviado_em", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[disparos/log/get]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o histórico de disparos." },
      { status: 500 }
    );
  }

  const log = (data as unknown as DbDispatchLogRow[]).map(mapDispatchLogRow);
  return NextResponse.json({ log });
}
