import { NextResponse } from "next/server";
import { getConnectionState, getInstanceInfo } from "@/lib/evolution/client";
import { refreshInstanceFromEvolution } from "@/lib/whatsapp/instance-store";

export async function GET() {
  try {
    const state = await getConnectionState();

    if (state === "open") {
      const info = await getInstanceInfo();
      await refreshInstanceFromEvolution();
      return NextResponse.json({
        status: "open",
        phoneNumber: info?.number ?? null,
        profileName: info?.profileName ?? null,
        profilePicUrl: info?.profilePicUrl ?? null,
      });
    }

    return NextResponse.json({
      status: state,
      phoneNumber: null,
      profileName: null,
      profilePicUrl: null,
    });
  } catch (error) {
    console.error("[whatsapp/status]", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o status da instância." },
      { status: 502 }
    );
  }
}
