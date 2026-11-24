// Emails a stored contact note. The recipient is a server secret, never returned to the browser.
// verify_jwt is off because the public site uses a publishable key, not a user JWT.
// A note is emailed only when a matching row exists and has not been mailed yet.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Note = { name?: unknown; email?: unknown; message?: unknown; companyUrl?: unknown };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false }, 405);

  let body: Note;
  try {
    body = (await req.json()) as Note;
  } catch {
    return json({ ok: false }, 400);
  }

  if (text(body.companyUrl, 200)) return json({ ok: true, emailed: false });

  const name = text(body.name, 80);
  const email = text(body.email, 200);
  const message = text(body.message, 4000);
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false }, 400);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? "";
  const to = Deno.env.get("CONTACT_TO_EMAIL") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!resendKey || !from || !to || !supabaseUrl || !serviceKey) {
    return json({ ok: true, emailed: false });
  }

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    select: "id,emailed_at",
    email: `eq.${email}`,
    message: `eq.${message}`,
    created_at: `gte.${since}`,
    order: "created_at.desc",
    limit: "1",
  });
  const found = await fetch(`${supabaseUrl}/rest/v1/contact_messages?${params}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!found.ok) return json({ ok: true, emailed: false });
  const rows = (await found.json()) as { id?: number; emailed_at?: string | null }[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row?.id || row.emailed_at) return json({ ok: true, emailed: false });

  const mailed = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `DeskZen note from ${name}`.slice(0, 120),
      text: `${name}\n${email}\n\n${message}\n`,
    }),
  });
  if (!mailed.ok) return json({ ok: true, emailed: false });

  await fetch(`${supabaseUrl}/rest/v1/contact_messages?id=eq.${row.id}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ emailed_at: new Date().toISOString() }),
  });

  return json({ ok: true, emailed: true });
});
