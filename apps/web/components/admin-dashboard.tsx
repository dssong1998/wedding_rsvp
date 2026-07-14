"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AdminStats = {
  totalAttendees: number;
  totalResponses: number;
};

type AdminRsvp = {
  id: number;
  weddingAttend: boolean;
  afterAttend: boolean;
  headcount: number;
  addrRoad: string;
  addrZip: string | null;
  addrDetail: string | null;
  updatedAt: string;
  guest: {
    id: number;
    name: string;
    seats: number;
  };
};

type SupportTicket = {
  id: string;
  sessionId: string;
  question: string;
  inviteName: string | null;
  status: "pending" | "answered";
  response: string | null;
  createdAt: string;
  answeredAt: string | null;
};

type SupportStreamPayload =
  | { type: "connected"; scope: "admin"; at: string }
  | { type: "ping"; scope: "admin"; at: string }
  | { type: "ticket_created"; ticket: SupportTicket }
  | { type: "ticket_answered"; ticket: SupportTicket };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://localhost:4000";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function upsertSupportTicket(list: SupportTicket[], ticket: SupportTicket): SupportTicket[] {
  const next = [ticket, ...list.filter((row) => row.id !== ticket.id)];
  next.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return next.slice(0, 200);
}

export function AdminDashboard(): JSX.Element {
  const [otp, setOtp] = useState("");
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rsvps, setRsvps] = useState<AdminRsvp[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState<Record<string, string>>({});
  const [supportSendingTicketId, setSupportSendingTicketId] = useState<string | null>(null);
  const [supportStreamState, setSupportStreamState] = useState("실시간 채널 대기");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    if (!stats) return "OTP 인증 후 통계를 불러오세요.";
    return `총 응답 ${stats.totalResponses}건 · 누적 참석 ${stats.totalAttendees}명`;
  }, [stats]);

  const supportSummary = useMemo(() => {
    const pendingCount = supportTickets.filter((ticket) => ticket.status === "pending").length;
    const answeredCount = supportTickets.filter((ticket) => ticket.status === "answered").length;
    return `대기 ${pendingCount}건 · 응답 완료 ${answeredCount}건`;
  }, [supportTickets]);

  async function requestOtp(): Promise<void> {
    setError("");
    setLoading(true);
    try {
      await call<{ ok: true }>("/admin/otp/request", { method: "POST", body: "{}" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await call<{ ok: true }>("/admin/otp/verify", {
        method: "POST",
        body: JSON.stringify({ code: otp })
      });
      setReady(true);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refresh(includeSupport = ready): Promise<void> {
    setError("");
    setLoading(true);
    try {
      const [nextStats, nextRsvps, nextSupportTickets] = await Promise.all([
        call<AdminStats>("/admin/stats"),
        call<AdminRsvp[]>("/admin/rsvps"),
        includeSupport
          ? call<SupportTicket[]>("/chatbot/admin/tickets")
          : Promise.resolve<SupportTicket[]>([])
      ]);
      setStats(nextStats);
      setRsvps(nextRsvps);
      if (includeSupport) {
        setSupportTickets(nextSupportTickets);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReady(false);
    } finally {
      setLoading(false);
    }
  }

  async function respondToSupportTicket(ticketId: string): Promise<void> {
    const response = (supportReplyDrafts[ticketId] ?? "").trim();
    if (!response) {
      setError("답변 내용을 입력해 주세요.");
      return;
    }

    setError("");
    setSupportSendingTicketId(ticketId);
    try {
      const updated = await call<SupportTicket>("/chatbot/admin/respond", {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          response
        })
      });
      setSupportTickets((prev) => upsertSupportTicket(prev, updated));
      setSupportReplyDrafts((prev) => ({
        ...prev,
        [ticketId]: ""
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSupportSendingTicketId(null);
    }
  }

  useEffect(() => {
    if (!ready) return;

    const source = new EventSource(`${API_BASE}/chatbot/admin/subscribe`, {
      withCredentials: true
    });

    setSupportStreamState("실시간 채널 연결 중");

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SupportStreamPayload;
        if (payload.type === "connected") {
          setSupportStreamState("실시간 채널 연결됨");
          return;
        }
        if (payload.type === "ping") {
          return;
        }
        if (payload.type === "ticket_created" || payload.type === "ticket_answered") {
          setSupportTickets((prev) => upsertSupportTicket(prev, payload.ticket));
        }
      } catch {
        // ignore malformed payload
      }
    };

    source.onerror = () => {
      setSupportStreamState("실시간 채널 재연결 중");
    };

    return () => {
      source.close();
      setSupportStreamState("실시간 채널 종료");
    };
  }, [ready]);

  return (
    <main className="admin-root">
      <div className="admin-wrap">
        <section className="admin-card">
          <h1 style={{ marginTop: 0 }}>RSVP 관리자</h1>
          <p style={{ marginTop: 0, color: "#5f6f86" }}>{summary}</p>
          <div className="admin-row">
            <button type="button" className="admin-btn secondary" onClick={requestOtp} disabled={loading}>
              OTP 요청
            </button>
            <form className="admin-row" onSubmit={verifyOtp}>
              <input
                className="admin-input"
                placeholder="6자리 OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                maxLength={6}
              />
              <button type="submit" className="admin-btn" disabled={loading}>
                OTP 인증
              </button>
            </form>
            <button
              type="button"
              className="admin-btn secondary"
              onClick={() => {
                void refresh();
              }}
              disabled={!ready || loading}
            >
              새로고침
            </button>
          </div>
          {error ? <p style={{ color: "#b62828", marginBottom: 0 }}>{error}</p> : null}
        </section>

        <section className="admin-card">
          <h2 style={{ marginTop: 0 }}>응답 목록</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>결혼식</th>
                  <th>애프터</th>
                  <th>인원</th>
                  <th>주소</th>
                  <th>수정시각</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.guest.name}</strong>
                      <div>
                        <span className="admin-badge">좌석 {row.guest.seats}</span>
                      </div>
                    </td>
                    <td>{row.weddingAttend ? "참석" : "불참"}</td>
                    <td>{row.afterAttend ? "참석" : "불참"}</td>
                    <td>{row.headcount}</td>
                    <td>
                      {[row.addrZip, row.addrRoad, row.addrDetail].filter(Boolean).join(" ")}
                    </td>
                    <td>{new Date(row.updatedAt).toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
                {rsvps.length === 0 ? (
                  <tr>
                    <td colSpan={6}>응답 데이터가 없습니다.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-support-head">
            <h2 style={{ margin: 0 }}>실시간 문의</h2>
            <span className="admin-badge">{supportSummary}</span>
          </div>
          <p style={{ marginTop: 8, color: "#5f6f86" }}>
            상태: {supportStreamState}
          </p>

          <div className="admin-support-list">
            {supportTickets.map((ticket) => (
              <article key={ticket.id} className="admin-support-item">
                <div className="admin-support-meta">
                  <span
                    className={
                      ticket.status === "pending"
                        ? "admin-support-status pending"
                        : "admin-support-status answered"
                    }
                  >
                    {ticket.status === "pending" ? "응답 대기" : "응답 완료"}
                  </span>
                  <span>{new Date(ticket.createdAt).toLocaleString("ko-KR")}</span>
                  <span>세션 {ticket.sessionId.slice(0, 8)}...</span>
                  {ticket.inviteName ? <span>초대명 {ticket.inviteName}</span> : null}
                </div>

                <p className="admin-support-question">Q. {ticket.question}</p>

                {ticket.response ? (
                  <p className="admin-support-answer">A. {ticket.response}</p>
                ) : null}

                {ticket.status === "pending" ? (
                  <div className="admin-support-reply-row">
                    <input
                      className="admin-input admin-support-reply-input"
                      placeholder="실시간 답변 입력"
                      value={supportReplyDrafts[ticket.id] ?? ""}
                      onChange={(event) =>
                        setSupportReplyDrafts((prev) => ({
                          ...prev,
                          [ticket.id]: event.target.value
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => respondToSupportTicket(ticket.id)}
                      disabled={supportSendingTicketId === ticket.id}
                    >
                      {supportSendingTicketId === ticket.id ? "전송 중..." : "답변 전송"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}

            {supportTickets.length === 0 ? (
              <p className="admin-support-empty">아직 접수된 실시간 문의가 없습니다.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
