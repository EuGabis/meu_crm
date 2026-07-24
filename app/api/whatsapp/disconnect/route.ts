import { NextResponse } from "next/server";
import { logoutInstance } from "@/lib/evolution/client";
import { setInstanceStatus } from "@/lib/whatsapp/instance-store";

export async function POST() {
  try {
    await logoutInstance();
    await setInstanceStatus("close");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[whatsapp/disconnect]", error);
    return NextResponse.json(
      { error: "Não foi possível desconectar a instância." },
      { status: 502 }
    );
  }
}
