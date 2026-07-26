import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Sem permissão." }, { status: auth.status });
  }

  const { id } = await params;

  // Evita que o usuário remova o próprio acesso e se tranque para fora.
  if (id === auth.id) {
    return NextResponse.json(
      { error: "Você não pode remover o seu próprio acesso." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) {
    console.error("[usuarios/delete]", error);
    return NextResponse.json(
      { error: "Não foi possível remover o acesso." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
