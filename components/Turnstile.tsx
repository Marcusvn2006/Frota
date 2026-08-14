"use client";

import Script from "next/script";

// Widget do Cloudflare Turnstile. Renderizado dentro de um <form>, o script da
// Cloudflare injeta automaticamente um input escondido "cf-turnstile-response"
// com o token, que a server action lê e valida (lib/turnstile).
//
// Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY não renderiza nada (dev/local sem chaves).
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <div className="flex justify-center">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </div>
  );
}
