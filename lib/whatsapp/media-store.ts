import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = ReturnType<typeof createSupabaseServerClient>;

const BUCKET = "whatsapp-media";

const EXT_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
  "audio/wav": "wav",
};

export function extFromMime(mime: string): string {
  return EXT_POR_MIME[mime.split(";")[0].trim().toLowerCase()] ?? "bin";
}

/** Sobe um base64 (com ou sem prefixo data:) no bucket privado e devolve o caminho. */
export async function uploadWhatsappMedia(
  supabase: ServerClient,
  conversationId: string,
  base64: string,
  mime: string
): Promise<string> {
  const limpo = base64.includes(",") ? base64.split(",").pop()! : base64;
  const buffer = Buffer.from(limpo, "base64");
  const path = `${conversationId}/${crypto.randomUUID()}.${extFromMime(mime)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}

/** Baixa a mídia do bucket privado (usado pela rota proxy, atrás do login). */
export async function downloadWhatsappMedia(
  supabase: ServerClient,
  path: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return {
    buffer: await data.arrayBuffer(),
    contentType: data.type || "application/octet-stream",
  };
}
