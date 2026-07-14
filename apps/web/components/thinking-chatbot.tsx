"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ThinkingChatbotProps = {
  inviteName: string | null;
};

type ChatbotRole = "user" | "bot" | "system";

type ChatbotMessage = {
  id: string;
  role: ChatbotRole;
  text: string;
};

type PresetQuestion = {
  id: string;
  question: string;
  answer: string;
};

type AskUnknownQuestionResponse = {
  type: "pending";
  sessionId: string;
  ticketId: string;
  message: string;
};

type SessionStreamPayload =
  | { type: "connected"; scope: "guest"; at: string }
  | { type: "ping"; scope: "guest"; at: string }
  | {
      type: "admin_response";
      sessionId: string;
      ticketId: string;
      message: string;
      answeredAt: string;
    };

const SESSION_STORAGE_KEY = "wedding-thinking-chatbot-session-id";
const API_BASE_ENV = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    id: "timeline",
    question: "예식과 애프터파티 시간은 언제인가요?",
    answer:
      "본식과 애프터파티 시간은 상단 주요 안내 카드의 타임라인 항목에서 바로 확인하실 수 있어요. 최신 변경 사항은 공지 페이지가 우선입니다."
  },
  {
    id: "transport",
    question: "셔틀버스와 주차 정보는 어디서 보나요?",
    answer:
      "상단 주요 안내의 오시는 길 카드에서 셔틀 및 주차 안내를 확인할 수 있습니다. 현장 혼잡 시에는 공지 페이지 업데이트를 함께 확인해 주세요."
  },
  {
    id: "dresscode",
    question: "드레스코드는 어떻게 준비하면 좋을까요?",
    answer:
      "화이트·아이보리·그린 포인트 기준으로 가장 자연스럽게 맞출 수 있어요. 상세 가이드는 상단 가이드 카드에서 바로 보실 수 있습니다."
  },
  {
    id: "camera",
    question: "촬영 관련해서 주의할 점이 있나요?",
    answer:
      "플래시와 동선만 배려해 주시면 휴대폰/필름 모두 환영합니다. 중앙 통로 장시간 점유만 피해서 촬영해 주세요."
  }
];

function buildMessage(role: ChatbotRole, text: string): ChatbotMessage {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, role, text };
}

function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function isPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "0.0.0.0") {
    return true;
  }
  const parts = normalized.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) {
    return false;
  }
  const [first, second] = parts.map((part) => Number.parseInt(part, 10));
  return (
    first === 10 ||
    first === 127 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

function resolveClientApiBase(): string {
  if (API_BASE_ENV) return API_BASE_ENV;
  if (typeof window === "undefined") return "http://localhost:4000";

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  if (isPrivateHost(hostname)) {
    return `${protocol}//${hostname}:4000`;
  }
  const baseHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  const apiHost = baseHost.startsWith("api.") ? baseHost : `api.${baseHost}`;
  return `${protocol}//${apiHost}`;
}

function createSessionId(): string {
  const suffix = Math.random().toString(36).slice(2, 12);
  return `guest_${Date.now().toString(36)}_${suffix}`;
}

export function ThinkingChatbot({ inviteName }: ThinkingChatbotProps): JSX.Element {
  const [apiBase, setApiBase] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [questionInput, setQuestionInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("실시간 채널 준비 중");
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    buildMessage(
      "bot",
      "궁금한 내용을 질문해 주세요. 아래 질문 버튼은 즉시 답변되고, 기타 질문은 관리자에게 실시간으로 전달됩니다."
    )
  ]);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setApiBase(resolveClientApiBase());
    const saved =
      typeof window !== "undefined" ? window.localStorage.getItem(SESSION_STORAGE_KEY) : null;
    const nextSessionId = saved || createSessionId();
    if (!saved && typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    }
    setSessionId(nextSessionId);
  }, []);

  useEffect(() => {
    if (!apiBase || !sessionId) return;
    const eventSource = new EventSource(
      `${apiBase}/chatbot/subscribe?sessionId=${encodeURIComponent(sessionId)}`
    );

    setConnectionStatus("실시간 채널 연결 중");

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SessionStreamPayload;
        if (payload.type === "connected") {
          setConnectionStatus("실시간 채널 연결됨");
          return;
        }
        if (payload.type === "ping") {
          return;
        }
        if (payload.type === "admin_response") {
          setMessages((prev) =>
            [...prev, buildMessage("bot", `관리자 답변: ${payload.message}`)].slice(-120)
          );
        }
      } catch {
        // ignore malformed event
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus("실시간 채널 재연결 중");
    };

    return () => {
      eventSource.close();
      setConnectionStatus("실시간 채널 종료");
    };
  }, [apiBase, sessionId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  function appendMessages(...next: ChatbotMessage[]): void {
    setMessages((prev) => [...prev, ...next].slice(-120));
  }

  function handlePresetQuestion(item: PresetQuestion): void {
    appendMessages(
      buildMessage("user", item.question),
      buildMessage("bot", item.answer)
    );
  }

  async function submitUnknownQuestion(event: FormEvent): Promise<void> {
    event.preventDefault();
    const normalizedQuestion = normalizeQuestion(questionInput);
    if (!normalizedQuestion || !apiBase) return;

    setQuestionInput("");
    appendMessages(buildMessage("user", normalizedQuestion));

    const matchedPreset = PRESET_QUESTIONS.find(
      (item) => normalizeQuestion(item.question) === normalizedQuestion
    );
    if (matchedPreset) {
      appendMessages(buildMessage("bot", matchedPreset.answer));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: normalizedQuestion,
          sessionId: sessionId || undefined,
          inviteName: inviteName || undefined
        })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "문의 전달에 실패했습니다.");
      }

      const payload = (await response.json()) as AskUnknownQuestionResponse;
      if (payload.sessionId && payload.sessionId !== sessionId) {
        setSessionId(payload.sessionId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SESSION_STORAGE_KEY, payload.sessionId);
        }
      }

      appendMessages(
        buildMessage(
          "system",
          payload.message || "질문을 관리자에게 전달했습니다. 답변이 오면 바로 알려드릴게요."
        )
      );
    } catch (error) {
      appendMessages(
        buildMessage(
          "system",
          error instanceof Error
            ? error.message
            : "문의 전달 중 오류가 발생했습니다."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="thinking-chatbot" aria-label="질문 챗봇">
      <header className="thinking-chatbot-head">
        <h2>질문 챗봇</h2>
        <p>
          아래 질문은 즉시 답변됩니다. 목록에 없는 질문은 관리자 페이지로 전달되어 실시간으로 답변됩니다.
        </p>
      </header>

      <div className="thinking-chatbot-presets">
        {PRESET_QUESTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="thinking-chatbot-chip"
            onClick={() => handlePresetQuestion(item)}
          >
            {item.question}
          </button>
        ))}
      </div>

      <form className="thinking-chatbot-form" onSubmit={submitUnknownQuestion}>
        <input
          className="thinking-chatbot-input"
          placeholder="목록에 없는 질문을 입력하면 관리자에게 바로 전달됩니다."
          value={questionInput}
          onChange={(event) => setQuestionInput(event.target.value)}
          maxLength={300}
        />
        <button type="submit" className="thinking-chatbot-send" disabled={isSubmitting}>
          {isSubmitting ? "전송 중..." : "문의 전송"}
        </button>
      </form>

      <p className="thinking-chatbot-status">실시간 상태: {connectionStatus}</p>

      <div className="thinking-chatbot-stream" role="log" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`thinking-chatbot-message ${message.role}`}>
            {message.text}
          </div>
        ))}
        <div ref={listEndRef} />
      </div>
    </section>
  );
}
