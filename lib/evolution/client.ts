import "server-only";

export interface EvolutionQrCode {
  base64: string | null;
  code: string | null;
  pairingCode: string | null;
}

export interface EvolutionInstanceInfo {
  name: string;
  connectionStatus: "open" | "close" | "connecting";
  ownerJid: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  number: string | null;
}

function evolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

  if (!baseUrl || !apiKey || !instanceName) {
    throw new Error(
      "EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME precisam estar definidos em .env.local"
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, instanceName };
}

async function evolutionFetch(path: string, init?: RequestInit) {
  const { baseUrl, apiKey } = evolutionConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API ${path} falhou (${res.status}): ${body}`);
  }

  return res.json();
}

export async function connectInstance(): Promise<EvolutionQrCode> {
  const { instanceName } = evolutionConfig();
  const data = await evolutionFetch(`/instance/connect/${instanceName}`);
  return {
    base64: data.base64 ?? null,
    code: data.code ?? null,
    pairingCode: data.pairingCode ?? null,
  };
}

export async function getConnectionState(): Promise<string> {
  const { instanceName } = evolutionConfig();
  const data = await evolutionFetch(`/instance/connectionState/${instanceName}`);
  return data.instance?.state ?? "close";
}

export async function getInstanceInfo(): Promise<EvolutionInstanceInfo | null> {
  const { instanceName } = evolutionConfig();
  const data = await evolutionFetch(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`
  );
  const found = Array.isArray(data) ? data[0] : null;
  if (!found) return null;
  return {
    name: found.name,
    connectionStatus: found.connectionStatus,
    ownerJid: found.ownerJid ?? null,
    profileName: found.profileName ?? null,
    profilePicUrl: found.profilePicUrl ?? null,
    number: found.number ?? null,
  };
}

export async function logoutInstance(): Promise<void> {
  const { instanceName } = evolutionConfig();
  await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

export async function setWebhook(
  url: string,
  events: string[],
  headerSecret: string
): Promise<void> {
  const { instanceName } = evolutionConfig();
  await evolutionFetch(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url,
        events,
        byEvents: false,
        base64: true, // inclui a mídia (base64) no payload das mensagens recebidas
        headers: { apikey: headerSecret },
      },
    }),
  });
}

export async function sendTextMessage(
  remoteJid: string,
  text: string
): Promise<{ evolutionMessageId: string }> {
  const { instanceName } = evolutionConfig();
  const number = remoteJid.split("@")[0];
  const data = await evolutionFetch(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
  return { evolutionMessageId: data?.key?.id ?? `local-${crypto.randomUUID()}` };
}

/** Envia imagem (ou outro documento) via base64. */
export async function sendMediaMessage(
  remoteJid: string,
  opts: {
    mediatype: "image" | "document";
    mimetype: string;
    base64: string;
    fileName: string;
    caption?: string;
  }
): Promise<{ evolutionMessageId: string }> {
  const { instanceName } = evolutionConfig();
  const number = remoteJid.split("@")[0];
  const data = await evolutionFetch(`/message/sendMedia/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      mediatype: opts.mediatype,
      mimetype: opts.mimetype,
      caption: opts.caption ?? "",
      media: opts.base64,
      fileName: opts.fileName,
    }),
  });
  return { evolutionMessageId: data?.key?.id ?? `local-${crypto.randomUUID()}` };
}

/** Envia áudio como nota de voz (PTT). `audioBase64` sem o prefixo data:. */
export async function sendAudioMessage(
  remoteJid: string,
  audioBase64: string
): Promise<{ evolutionMessageId: string }> {
  const { instanceName } = evolutionConfig();
  const number = remoteJid.split("@")[0];
  const data = await evolutionFetch(`/message/sendWhatsAppAudio/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, audio: audioBase64, encoding: true }),
  });
  return { evolutionMessageId: data?.key?.id ?? `local-${crypto.randomUUID()}` };
}

/** Baixa a mídia de uma mensagem recebida (fallback quando o webhook não trouxe base64). */
export async function getMediaBase64(messageKey: {
  id?: string;
  remoteJid?: string;
  fromMe?: boolean;
}): Promise<{ base64: string; mimetype: string } | null> {
  const { instanceName } = evolutionConfig();
  try {
    const data = await evolutionFetch(
      `/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: "POST",
        body: JSON.stringify({ message: { key: messageKey }, convertToMp4: false }),
      }
    );
    if (!data?.base64) return null;
    return { base64: data.base64, mimetype: data.mimetype ?? "application/octet-stream" };
  } catch (error) {
    console.error("[evolution/getMediaBase64]", error);
    return null;
  }
}
