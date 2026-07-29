import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { downloadWhatsappMedia } from "@/lib/whatsapp/media-store";

// Serve a mídia do bucket privado. Fica atrás do login (o proxy.ts protege /api,
// exceto o webhook), então só usuários autenticados conseguem baixar.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path ausente" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const media = await downloadWhatsappMedia(supabase, path);
  if (!media) {
    return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  }

  return new NextResponse(media.buffer, {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
