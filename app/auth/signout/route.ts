import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

/** Encerra a sessão e volta pro login. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  // 303 força o browser a fazer GET no /login depois do POST.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
