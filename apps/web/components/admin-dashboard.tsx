"use client";

import { FormEvent, useMemo, useState } from "react";

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

export function AdminDashboard(): JSX.Element {
  const [otp, setOtp] = useState("");
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rsvps, setRsvps] = useState<AdminRsvp[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    if (!stats) return "OTP 인증 후 통계를 불러오세요.";
    return `총 응답 ${stats.totalResponses}건 · 누적 참석 ${stats.totalAttendees}명`;
  }, [stats]);

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
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refresh(): Promise<void> {
    setError("");
    setLoading(true);
    try {
      const [nextStats, nextRsvps] = await Promise.all([
        call<AdminStats>("/admin/stats"),
        call<AdminRsvp[]>("/admin/rsvps")
      ]);
      setStats(nextStats);
      setRsvps(nextRsvps);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReady(false);
    } finally {
      setLoading(false);
    }
  }

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
              onClick={refresh}
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
      </div>
    </main>
  );
}
