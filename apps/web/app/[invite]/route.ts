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

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

function extractRequestHostname(request: NextRequest): string {
  const rawHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim();
  if (!rawHost) return request.nextUrl.hostname;

  if (rawHost.startsWith("[")) {
    const closing = rawHost.indexOf("]");
    if (closing > 0) {
      return rawHost.slice(1, closing);
    }
  }

  const [hostOnly] = rawHost.split(":");
  return hostOnly || request.nextUrl.hostname;
}

function resolveServerApiBase(): string {
  if (SERVER_API_BASE) return SERVER_API_BASE;
  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}

function resolveClientApiBase(request: NextRequest): string {
  const requestHostname = extractRequestHostname(request);

  if (!CLIENT_API_BASE) {
    return `${request.nextUrl.protocol}//${requestHostname}:${DEFAULT_API_PORT}`;
  }

  try {
    const parsed = new URL(CLIENT_API_BASE);
    if (isLoopbackHost(parsed.hostname) && !isLoopbackHost(requestHostname)) {
      parsed.hostname = requestHostname;
      return parsed.toString().replace(/\/$/, "");
    }
    return CLIENT_API_BASE;
  } catch {
    return CLIENT_API_BASE;
  }
}

async function loadInvitationTemplate(preferredFile: "wedding-invite-1.html" | "wedding-invite-2.html"): Promise<string> {
  const candidatesByFile = {
    "wedding-invite-1.html": [
      path.resolve(process.cwd(), "wedding-invite-1.html"),
      path.resolve(process.cwd(), "../wedding-invite-1.html"),
      path.resolve(process.cwd(), "../../wedding-invite-1.html"),
      path.resolve(process.cwd(), "../../../wedding-invite-1.html"),
      "/app/wedding-invite-1.html"
    ],
    "wedding-invite-2.html": [
      path.resolve(process.cwd(), "wedding-invite-2.html"),
      path.resolve(process.cwd(), "../wedding-invite-2.html"),
      path.resolve(process.cwd(), "../../wedding-invite-2.html"),
      path.resolve(process.cwd(), "../../../wedding-invite-2.html"),
      "/app/wedding-invite-2.html"
    ]
  } as const;

  const probeOrder =
    preferredFile === "wedding-invite-1.html"
      ? (["wedding-invite-1.html", "wedding-invite-2.html"] as const)
      : (["wedding-invite-2.html"] as const);

  for (const fileName of probeOrder) {
    for (const candidate of candidatesByFile[fileName]) {
      try {
        return await fs.readFile(candidate, "utf8");
      } catch {
        // try next
      }
    }
  }

  throw new Error(`${preferredFile} 파일을 찾을 수 없습니다.`);
}

function shouldUseDesktopTemplate(request: NextRequest): boolean {
  const embedded = request.nextUrl.searchParams.get("embed") === "1";
  if (embedded) return false;
  const ua = request.headers.get("user-agent") ?? "";
  return !MOBILE_UA_REGEX.test(ua);
}

function decodeInviteName(raw: string): string | null {
  const decodedRaw = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })().trim();

  if (!decodedRaw.toLowerCase().startsWith("invited@")) {
    return null;
  }

  const token = decodedRaw.slice("invited@".length).trim();
  if (!token) {
    return null;
  }

  return token;
}

async function lookupGuest(apiBase: string, name: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/guests/lookup?name=${encodeURIComponent(name)}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { status?: string };
    return payload.status === "ok";
  } catch {
    return false;
  }
}

function injectImmersiveMeta(html: string): string {
  const viewportMeta =
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>';

  let updated = html;
  if (/<meta[^>]*name=["']viewport["'][^>]*>/i.test(updated)) {
    updated = updated.replace(/<meta[^>]*name=["']viewport["'][^>]*>/i, viewportMeta);
  } else if (updated.includes("</head>")) {
    updated = updated.replace("</head>", `${viewportMeta}\n</head>`);
  } else {
    updated = `${viewportMeta}\n${updated}`;
  }

  const extraMetas = [
    '<meta name="apple-mobile-web-app-capable" content="yes"/>',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
    '<meta name="mobile-web-app-capable" content="yes"/>',
    '<meta name="theme-color" content="#000000"/>'
  ];

  for (const meta of extraMetas) {
    const nameMatch = meta.match(/name="([^"]+)"/);
    const name = nameMatch?.[1];
    if (!name) continue;
    const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*>`, "i");
    if (regex.test(updated)) continue;
    if (updated.includes("</head>")) {
      updated = updated.replace("</head>", `${meta}\n</head>`);
    } else {
      updated = `${meta}\n${updated}`;
    }
  }

  return updated;
}

function injectRuntimeBridge(html: string, inviteName: string, clientApiBase: string): string {
  const frameLessStyle = "";

  const bridge = `
${frameLessStyle}
<script>
(function() {
  const invitedName = ${JSON.stringify(inviteName)};
  const apiBase = ${JSON.stringify(clientApiBase)};
  const state = { name: "", seats: 1, attend: null, after: null };
  let postcodeScriptLoading = null;
  let postcodePopupOpen = false;

  const g = (id) => document.getElementById(id);
  const setError = (id, message) => { const el = g(id); if (el) el.textContent = message; };

  function loadKakaoPostcodeScript() {
    if (window.daum && window.daum.Postcode) {
      return Promise.resolve();
    }
    if (postcodeScriptLoading) {
      return postcodeScriptLoading;
    }

    postcodeScriptLoading = new Promise(function(resolve, reject) {
      const existing = document.querySelector("script[data-kakao-postcode='true']");
      if (existing) {
        existing.addEventListener("load", function() { resolve(); }, { once: true });
        existing.addEventListener("error", function() { reject(new Error("load failed")); }, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.dataset.kakaoPostcode = "true";
      script.onload = function() { resolve(); };
      script.onerror = function() { reject(new Error("load failed")); };
      document.head.appendChild(script);
    });

    return postcodeScriptLoading;
  }

  function setupKakaoAddressLookup() {
    const zipInput = g("aZip");
    const roadInput = g("aRoad");
    if (!zipInput || !roadInput) return;

    zipInput.setAttribute("readonly", "readonly");
    roadInput.setAttribute("readonly", "readonly");
    roadInput.setAttribute("autocomplete", "off");
    zipInput.placeholder = "우편번호";
    roadInput.placeholder = "주소";
    zipInput.style.cursor = "pointer";
    roadInput.style.cursor = "pointer";

    const openAddressSearch = async function() {
      if (postcodePopupOpen) return;
      setError("subErr", "");

      try {
        await loadKakaoPostcodeScript();
        postcodePopupOpen = true;
        new window.daum.Postcode({
          oncomplete: function(data) {
            const extras = [];
            if (data.bname && /[동로가]$/.test(data.bname)) extras.push(data.bname);
            if (data.buildingName && data.apartment === "Y") extras.push(data.buildingName);
            const extraText = extras.length ? " (" + extras.join(", ") + ")" : "";
            const roadAddress = data.roadAddress || data.jibunAddress || "";

            zipInput.value = data.zonecode || "";
            roadInput.value = roadAddress + (data.roadAddress ? extraText : "");

            const detailInput = g("aDetail");
            if (detailInput) detailInput.focus();
            postcodePopupOpen = false;
          },
          onclose: function() {
            postcodePopupOpen = false;
          }
        }).open();
      } catch (_) {
        postcodePopupOpen = false;
        setError("subErr", "카카오 주소 검색 API를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    };

    const keyOpenHandler = function(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void openAddressSearch();
      }
    };

    zipInput.addEventListener("click", function() {
      void openAddressSearch();
    });
    roadInput.addEventListener("click", function() {
      void openAddressSearch();
    });
    zipInput.addEventListener("keydown", keyOpenHandler);
    roadInput.addEventListener("keydown", keyOpenHandler);
  }

  function resetChoiceStyles() {
    ["w-yes", "w-no", "a-yes", "a-no"].forEach(function(id) {
      const btn = g(id);
      if (btn) btn.classList.remove("sel");
    });
  }

  function setChoice(group, value, element) {
    state[group] = value;
    const pair = group === "attend" ? ["w-yes", "w-no"] : ["a-yes", "a-no"];
    pair.forEach(function(id) {
      const btn = g(id);
      if (btn) btn.classList.remove("sel");
    });
    if (element) element.classList.add("sel");
    const countField = g("count-field");
    if (countField) countField.style.display = group === "attend" && value === "no" ? "none" : "";
  }

  function setGuestNameMessage(name) {
    const guestName = g("guest-name");
    if (!guestName) return;
    const normalizedName = (name || "").trim();
    guestName.textContent = normalizedName ? normalizedName + " 님을 모십니다." : "";
  }

  async function prefillExisting(name) {
    try {
      const response = await fetch(apiBase + "/rsvp/me?name=" + encodeURIComponent(name));
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload || !payload.rsvp) return;
      const rsvp = payload.rsvp;

      if (typeof rsvp.weddingAttend === "boolean") {
        const btn = g(rsvp.weddingAttend ? "w-yes" : "w-no");
        setChoice("attend", rsvp.weddingAttend ? "yes" : "no", btn);
      }
      if (typeof rsvp.afterAttend === "boolean") {
        const btn = g(rsvp.afterAttend ? "a-yes" : "a-no");
        setChoice("after", rsvp.afterAttend ? "yes" : "no", btn);
      }
      if (g("count")) g("count").value = String(Math.max(1, rsvp.headcount || 1));
      if (g("aZip")) g("aZip").value = rsvp.addrZip || "";
      if (g("aRoad")) g("aRoad").value = rsvp.addrRoad || "";
      if (g("aDetail")) g("aDetail").value = rsvp.addrDetail || "";
    } catch (_) {}
  }

  window.pick = function(group, value, element) {
    setChoice(group, value, element);
  };

  window.identifyGuest = async function() {
    setError("idErr", "");
    const name = (g("gname") && g("gname").value || "").trim();
    if (!name) {
      setError("idErr", "성함을 적어주세요.");
      return;
    }
    try {
      const response = await fetch(apiBase + "/guests/lookup?name=" + encodeURIComponent(name));
      const payload = await response.json();
      if (!response.ok || payload.status !== "ok") {
        setError("idErr", "초대 명단에서 성함을 찾을 수 없습니다.");
        return;
      }
      state.name = payload.name;
      state.seats = payload.seats || 1;
      state.attend = null;
      state.after = null;
      setGuestNameMessage(state.name);

      const seats = g("seats");
      if (seats) seats.innerHTML = "<b>" + state.name + "</b>님, <b class='n'>" + state.seats + "</b>석이 준비되어 있어요.";

      if (g("count")) {
        g("count").max = String(state.seats);
        g("count").value = "1";
      }
      if (g("aName")) g("aName").value = state.name;

      resetChoiceStyles();
      const block = g("rsvp2");
      if (block) block.classList.add("identified");
      setTimeout(function() {
        const target = g("seats");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 300);
      await prefillExisting(state.name);
    } catch (error) {
      setError("idErr", "하객 확인 중 오류가 발생했습니다.");
    }
  };

  window.submitRsvp = async function() {
    setError("subErr", "");
    if (!state.name) {
      setError("subErr", "먼저 하객 확인을 진행해 주세요.");
      return;
    }
    if (!state.attend) {
      setError("subErr", "결혼식 참석 여부를 선택해 주세요.");
      return;
    }
    if (!state.after) {
      setError("subErr", "애프터파티 참석 여부를 선택해 주세요.");
      return;
    }

    const road = (g("aRoad") && g("aRoad").value || "").trim();
    if (!road) {
      setError("subErr", "실물 청첩장을 받으실 주소를 적어주세요.");
      if (g("aRoad")) g("aRoad").focus();
      return;
    }

    const zip = (g("aZip") && g("aZip").value || "").trim();
    const detail = (g("aDetail") && g("aDetail").value || "").trim();
    const countRaw = Number.parseInt((g("count") && g("count").value) || "1", 10);
    const count = Number.isFinite(countRaw) ? Math.max(1, countRaw) : 1;
    const weddingAttend = state.attend === "yes";

    const payload = {
      name: state.name,
      weddingAttend: weddingAttend,
      afterAttend: state.after === "yes",
      headcount: weddingAttend ? count : 1,
      addrRoad: road,
      addrZip: zip || undefined,
      addrDetail: detail || undefined
    };

    try {
      const response = await fetch(apiBase + "/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.text();
        setError("subErr", body || "회신 저장에 실패했습니다.");
        return;
      }

      const saved = await response.json();
      const msg = weddingAttend
        ? state.name + "님, 8월 22일에 꼭 뵐게요. 실물 청첩장을 곧 우편으로 보내드릴게요."
        : state.name + "님, 마음 전해주셔서 고마워요. 준비한 청첩장은 우편으로 보내드릴게요.";

      if (g("sentMsg")) g("sentMsg").textContent = msg;

      let recap = "성함 — " + state.name + "\\n결혼식 — " + (weddingAttend ? "참석" : "불참");
      if (weddingAttend) recap += " (" + saved.headcount + "명)";
      recap += "\\n애프터 — " + (state.after === "yes" ? "참석" : "불참");
      recap += "\\n발송 — " + [zip ? "[" + zip + "]" : "", road, detail].filter(Boolean).join(" ");
      recap += "\\n현재 누적 참석 — " + saved.totalAttendees + "명";

      if (g("sentRecap")) {
        g("sentRecap").innerHTML = recap.split("\\n").map(function(line) {
          const pair = line.split(" — ");
          const key = pair[0] || "";
          const value = pair[1] || "";
          return "<div><b>" + key + "</b> · " + value + "</div>";
        }).join("");
      }

      const block = g("rsvp2");
      if (block) block.classList.add("done");
      if (block) block.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    } catch (_) {
      setError("subErr", "회신 저장 중 오류가 발생했습니다.");
    }
  };

  window.resetAll = function() {
    const block = g("rsvp2");
    if (block) block.classList.remove("done", "identified");
    ["gname", "last4", "count", "aName", "aPhone", "aZip", "aRoad", "aDetail"].forEach(function(id) {
      const el = g(id);
      if (el) el.value = "";
    });
    setError("idErr", "");
    setError("subErr", "");
    state.name = "";
    state.seats = 1;
    state.attend = null;
    state.after = null;
    setGuestNameMessage(invitedName);
    const last4Field = g("last4-field");
    if (last4Field) last4Field.style.display = "none";
    if (window.backToCard) window.backToCard();
  };

  document.addEventListener("DOMContentLoaded", function() {
    setupKakaoAddressLookup();
    setGuestNameMessage(invitedName);
    const nameField = g("gname");
    if (nameField && !nameField.value) {
      nameField.value = invitedName;
    }
    if (nameField && invitedName) {
      window.identifyGuest();
    }
  });
})();
</script>
`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${bridge}\n</body>`);
  }
  return `${html}\n${bridge}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invite: string }> }
): Promise<Response> {
  const { invite } = await context.params;
  const inviteName = decodeInviteName(invite);
  if (!inviteName) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  const serverApiBase = resolveServerApiBase();
  const isInvited = await lookupGuest(serverApiBase, inviteName);
  if (!isInvited) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  const desktopTemplate = shouldUseDesktopTemplate(request);
  const template = await loadInvitationTemplate(desktopTemplate ? "wedding-invite-1.html" : "wedding-invite-2.html");
  const immersiveTemplate = injectImmersiveMeta(template);
  const clientApiBase = resolveClientApiBase(request);
  const body = desktopTemplate ? immersiveTemplate : injectRuntimeBridge(immersiveTemplate, inviteName, clientApiBase);
  return new NextResponse(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
