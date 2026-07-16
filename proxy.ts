import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// /nova-senha precisa ser pública: o link de redefinição de senha chega sem
// sessão ainda (a troca do código por sessão acontece no client, depois que
// a página carrega). Se não estiver aqui, o proxy redireciona para /login
// antes da página processar o link.
const PUBLIC_PATHS = ["/login", "/cadastrar", "/esqueci-senha", "/nova-senha"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas de API cuidam da própria autenticação (ex.: CRON_SECRET no cron
  // de vencimentos, ou simplesmente nenhuma, como /api/health). O redirect
  // para /login abaixo não se aplica a chamadas de API.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() decodifica o JWT dos cookies localmente, sem ida à rede —
  // ao contrário de getUser(), que valida contra o servidor do Supabase a
  // cada chamada. Isso é seguro aqui porque o proxy só decide se redireciona
  // para /login por UX; ele não é o limite de autorização. Cada página, ao
  // renderizar, chama getUsuarioAtual() (que usa getUser() de verdade, com
  // validação de rede) como checagem autoritativa, e o RLS do Postgres
  // aplica a autorização real em toda query — então uma sessão adulterada ou
  // revogada não passaria de qualquer forma, só não é pega neste ponto.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|icons|manifest(?:\\.json|\\.webmanifest)|.*\\.png$|.*\\.svg$).*)",
  ],
};
