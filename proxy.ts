import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Páginas públicas (não exigem sessão). */
const PAGINAS_PUBLICAS = [
  "/login",
  "/esqueci-senha",
  "/nova-senha",
  "/auth/callback",
  "/auth/signout",
];

/** Rotas de API públicas (ex.: webhook do WhatsApp, com segredo próprio). */
const API_PUBLICAS = ["/api/whatsapp/webhook"];

function casa(pathname: string, lista: string[]): boolean {
  return lista.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const paginaPublica = casa(pathname, PAGINAS_PUBLICAS);
  const apiPublica = casa(pathname, API_PUBLICAS);

  // Já logado tentando ver o /login → manda pro app.
  if (user && pathname === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = request.nextUrl.searchParams.get("redirect") || "/painel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (paginaPublica || apiPublica) return response;

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Roda em tudo, menos assets estáticos do Next e arquivos com extensão de imagem.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
