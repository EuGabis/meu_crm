import { NextResponse } from "next/server";
import { connectInstance, setWebhook } from "@/lib/evolution/client";

function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST() {
  try {
    const webhookUrl = `${getAppBaseUrl()}/api/whatsapp/webhook`;
    await setWebhook(
      webhookUrl,
      ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      process.env.EVOLUTION_WEBHOOK_SECRET!
    );
    const qr = await connectInstance();
    return NextResponse.json(qr);
  } catch (error) {
    console.error("[whatsapp/connect]", error);
    return NextResponse.json(
      { error: "Não foi possível conectar à Evolution API." },
      { status: 502 }
    );
  }
}
