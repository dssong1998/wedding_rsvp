import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLIENT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
  "";
const SERVER_API_BASE =
  process.env.API_BASE?.replace(/\/$/, "") ??
  CLIENT_API_BASE;
const DEFAULT_API_PORT = process.env.API_PORT ?? "4000";

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

function isIpv4Address(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((segment) => {
    if (!/^\d{1,3}$/.test(segment)) return false;
    const value = Number.parseInt(segment, 10);
    return value >= 0 && value <= 255;
  });
}

function isPrivateNetworkHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (isLoopbackHost(normalized)) return true;
  if (!isIpv4Address(normalized)) return false;
  const [first, second] = normalized.split(".").map((segment) => Number.parseInt(segment, 10));
  return (
    first === 10 ||
    first === 127 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

function extractRequestHostname(request: NextRequest): string {
  const rawHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim();
  if (!rawHost) return request.nextUrl.hostname;

  if (rawHost.startsWith("[")) {
    const closing = rawHost.indexOf("]");
    if (closing > 0) return rawHost.slice(1, closing);
  }

  const [hostOnly] = rawHost.split(":");
  return hostOnly || request.nextUrl.hostname;
}

function resolveServerApiBase(): string {
  if (SERVER_API_BASE) return SERVER_API_BASE;
  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}

function resolveClientApiOriginByHost(request: NextRequest, hostname: string): string {
  const normalized = hostname.toLowerCase();
  if (isPrivateNetworkHost(normalized)) {
    return `${request.nextUrl.protocol}//${normalized}:${DEFAULT_API_PORT}`;
  }
  const baseHost = normalized.startsWith("www.") ? normalized.slice(4) : normalized;
  const apiHost = baseHost.startsWith("api.") ? baseHost : `api.${baseHost}`;
  return `${request.nextUrl.protocol}//${apiHost}`;
}

function resolveClientApiBase(request: NextRequest): string {
  const requestHostname = extractRequestHostname(request);

  if (!CLIENT_API_BASE) {
    return resolveClientApiOriginByHost(request, requestHostname);
  }

  try {
    const parsed = new URL(CLIENT_API_BASE);
    if (
      isPrivateNetworkHost(parsed.hostname) &&
      parsed.hostname.toLowerCase() !== requestHostname.toLowerCase()
    ) {
      return resolveClientApiOriginByHost(request, requestHostname);
    }
    return CLIENT_API_BASE;
  } catch {
    return resolveClientApiOriginByHost(request, requestHostname);
  }
}

function decodeInviteName(raw: string | null): string | null {
  if (!raw) return null;

  const decodedRaw = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })().trim();

  if (!decodedRaw) return null;

  if (decodedRaw.toLowerCase().startsWith("invited@")) {
    const token = decodedRaw.slice("invited@".length).trim();
    return token || null;
  }

  return decodedRaw;
}

async function lookupGuest(apiBase: string, name: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/guests/lookup?name=${encodeURIComponent(name)}`, {
      cache: "no-store"
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { status?: string };
    return payload.status === "ok";
  } catch {
    return false;
  }
}

async function loadFunTemplate(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "wedding-fun.html"),
    path.resolve(process.cwd(), "../wedding-fun.html"),
    path.resolve(process.cwd(), "../../wedding-fun.html"),
    path.resolve(process.cwd(), "../../../wedding-fun.html"),
    "/app/wedding-fun.html"
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      // try next candidate
    }
  }

  throw new Error("wedding-fun.html 파일을 찾을 수 없습니다.");
}

function injectRuntimeBridge(html: string, inviteName: string, clientApiBase: string): string {
  const inviteToken = `invited@${inviteName}`;
  const bridge = `
<script>
(function() {
  window.__INVITE_SOURCE_NAME = ${JSON.stringify(inviteName)};
  window.__INVITE_SOURCE_TOKEN = ${JSON.stringify(inviteToken)};
  window.__INVITE_API_BASE = ${JSON.stringify(clientApiBase)};
})();
</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${bridge}\n</head>`);
  }
  return `${bridge}\n${html}`;
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("invite") ?? request.nextUrl.searchParams.get("name");
  const inviteName = decodeInviteName(source);
  if (!inviteName) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const serverApiBase = resolveServerApiBase();
  const guestExists = await lookupGuest(serverApiBase, inviteName);
  if (!guestExists) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const template = await loadFunTemplate();
  const body = injectRuntimeBridge(template, inviteName, resolveClientApiBase(request));

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
