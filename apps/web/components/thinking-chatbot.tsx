'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type ThinkingChatbotProps = {
  inviteName: string | null;
};

type ChatbotRole = 'user' | 'bot' | 'system';

type ChatbotMessage = {
  id: string;
  role: ChatbotRole;
  text: string | string[];
};

type PresetQuestion = {
  id: string;
  question: string;
  answer: string[];
};

type AskUnknownQuestionResponse = {
  type: 'pending';
  sessionId: string;
  ticketId: string;
  message: string;
};

type SessionStreamPayload =
  | { type: 'connected'; scope: 'guest'; at: string }
  | { type: 'ping'; scope: 'guest'; at: string }
  | {
      type: 'admin_response';
      sessionId: string;
      ticketId: string;
      message: string;
      answeredAt: string;
    };

const SESSION_STORAGE_KEY = 'wedding-thinking-chatbot-session-id';
const API_BASE_ENV = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? '';

const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    id: 'venue',
    question: '예식 장소',
    answer: [
      '예식 장소는 보넬리 가든(서울 서초구 샘마루길 11)입니다.',
      '상단 첫번째 글에서 장소에 대한 자세한 정보를 확인하실 수 있어요.',
    ],
  },
  {
    id: 'rain',
    question: '우천 시 계획',
    answer: [
      '우천 시 예식과 식사, 파티를 진행할 수 있는 실내 장소가 모두 별도로 마련되어 있습니다. 그러니 걱정마시고 한껏 결혼식을 즐겨주세요.',
    ],
  },
  {
    id: 'parking',
    question: '주차 여부',
    answer: [
      '무료 주차가 가능합니다. 보넬리가든까지 찾아오시면 주차요원의 도움을 받아 주차장으로 이동하실 수 있습니다.',
      '주차 공간은 [서초 과학화훈련장 강동송파주차장]에 넓은 공간이 있고, 연결된 길을 따라 곧장 예식장으로 이동할 수 있습니다.',
      '노약자 하차구역은 예식장 내부에 별도로 준비되어 있으니 주차 요원분께 확인해 주세요.',
    ],
  },
  {
    id: 'shuttle',
    question: '셔틀버스 운행',
    answer: [
      '셔틀버스는 16시 30분부터 [양재 시민의 숲]역 4번 출구와 예식장 사이에서 운행됩니다.',
      '애프터파티가 끝난 21시 30분까지 운행하니 편하게 이용해 주세요.',
    ],
  },
  {
    id: 'timeline',
    question: '결혼식 일정',
    answer: [
      '공간 오픈 16:30, 권장 도착 17:00, 본식 17:30입니다.',
      '식사는 본식 직후 18:00부터, 애프터파티는 19:00~21:00(귀가 셔틀 ~21:30)입니다.',
      '웰컴 드링크와 인사를 위해 최소 17시까지 도착을 권장드려요.',
    ],
  },
  {
    id: 'dresscode',
    question: '드레스코드',
    answer: [
      '드레스코드는 대체로 서로 처음 만날 하객 분들을 위해 준비한 작은 컨텐츠입니다.',
      '화이트·베이지·그린 등 밝은 색의 컬러 아이템을 최소 1개 이상 맞춰 주시면 됩니다.',
      '강제 사항은 아니며, 복장 종류에도 제한이 없어요. 모두가 주인공이라는 마음으로 밝은 빛을 내주시면 좋겠습니다.',
    ],
  },
  {
    id: 'photo',
    question: '사진 촬영',
    answer: [
      '사진은 언제든 자유롭게 촬영 가능합니다. 대신 신랑신부의 동선만 과도하게 막지 말아 주세요.',
      '단체 사진 촬영은 별도로 준비되어있지 않으며 소그룹 사진과 개별 사진으로 채울 예정입니다.',
      '또한 하객분들이 이용하실 수 있도록 입구에 필름카메라를 비치해 둘 계획이니 사용하신 뒤 수거함에 넣어 주시면 현상 이후에 공유해드릴게요.',
    ],
  },
  {
    id: 'afterparty',
    question: '애프터파티는 무엇인가요?',
    answer: [
      '애프터파티는 결혼식 이후 즐기는 웨딩 파티로 21시까지 같은 장소에서 술과 음악과 함께 편히 드시고 놀다 가시면 됩니다.',
      '여행지에서 모은 여러 종류의 술을 준비해 두었고, 드시고 싶은 음식이나 함께 마시고 싶은 술은 자유롭게 가져오셔도 괜찮아요.',
      '다만, 본식 전까지는 음주가 금지되며, 논알코올 웰컴드링크와 음료가 제공됩니다. 음주는 애프터파티 때에 부탁드려요.',
    ],
  },
  {
    id: 'theme',
    question: '어떤 분위기의 결혼식인가요?',
    answer: [
      '저희가 정한 결혼식의 주제는 [사랑 예찬]입니다.',
      '초록색과 하얀색을 중심으로 최대한 단순하고 자연스럽게 아름다운 공간을 연출했고, 한적한 여유와 휴식 속에서 사랑의 낭만을 느낄 수 있도록 모든 콘텐츠를 구성했어요.',
    ],
  },
  {
    id: 'cash',
    question: 'ATM기 이용',
    answer: [
      '저희의 결혼식장에는 ATM기가 비치되어 있지 않습니다.',
      '현금 인출이 필요하실 경우에는 결혼식 도착 전에 준비하셔야 하며, 축의금의 경우 계좌이체를 이용하실 수 있습니다.',
    ],
  },
];

function buildMessage(
  role: ChatbotRole,
  text: string | string[],
): ChatbotMessage {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, role, text };
}

function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function isPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0'
  ) {
    return true;
  }
  const parts = normalized.split('.');
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
  if (typeof window === 'undefined') return 'http://localhost:4000';

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  if (isPrivateHost(hostname)) {
    return `${protocol}//${hostname}:4000`;
  }
  const baseHost = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  const apiHost = baseHost.startsWith('api.') ? baseHost : `api.${baseHost}`;
  return `${protocol}//${apiHost}`;
}

function createSessionId(): string {
  const suffix = Math.random().toString(36).slice(2, 12);
  return `guest_${Date.now().toString(36)}_${suffix}`;
}

export function ThinkingChatbot({
  inviteName,
}: ThinkingChatbotProps): JSX.Element {
  const [apiBase, setApiBase] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState('실시간 채널 준비 중');
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    buildMessage(
      'bot',
      '안녕하세요 ! 대석과 다인의 결혼식에 오신 것을 환영합니다 ! 궁금한 내용은 편하게 질문해주세요 :)',
    ),
  ]);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(false);

  useEffect(() => {
    setApiBase(resolveClientApiBase());
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(SESSION_STORAGE_KEY)
        : null;
    const nextSessionId = saved || createSessionId();
    if (!saved && typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    }
    setSessionId(nextSessionId);
  }, []);

  useEffect(() => {
    if (!apiBase || !sessionId) return;
    const eventSource = new EventSource(
      `${apiBase}/chatbot/subscribe?sessionId=${encodeURIComponent(sessionId)}`,
    );

    setConnectionStatus('실시간 채널 연결 중');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SessionStreamPayload;
        if (payload.type === 'connected') {
          setConnectionStatus('실시간 채널 연결됨');
          return;
        }
        if (payload.type === 'ping') {
          return;
        }
        if (payload.type === 'admin_response') {
          shouldAutoScrollRef.current = true;
          setMessages((prev) =>
            [
              ...prev,
              buildMessage('bot', `관리자 답변: ${payload.message}`),
            ].slice(-120),
          );
        }
      } catch {
        // ignore malformed event
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('실시간 채널 재연결 중');
    };

    return () => {
      eventSource.close();
      setConnectionStatus('실시간 채널 종료');
    };
  }, [apiBase, sessionId]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    shouldAutoScrollRef.current = false;
    const stream = streamRef.current;
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  }, [messages]);

  function appendMessages(...next: ChatbotMessage[]): void {
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, ...next].slice(-120));
  }

  function handlePresetQuestion(item: PresetQuestion): void {
    appendMessages(
      buildMessage('user', item.question),
      buildMessage('bot', item.answer),
    );
  }

  async function submitUnknownQuestion(event: FormEvent): Promise<void> {
    event.preventDefault();
    const normalizedQuestion = normalizeQuestion(questionInput);
    if (!normalizedQuestion || !apiBase) return;

    setQuestionInput('');
    appendMessages(buildMessage('user', normalizedQuestion));

    const matchedPreset = PRESET_QUESTIONS.find(
      (item) => normalizeQuestion(item.question) === normalizedQuestion,
    );
    if (matchedPreset) {
      appendMessages(buildMessage('bot', matchedPreset.answer));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/chatbot/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: normalizedQuestion,
          sessionId: sessionId || undefined,
          inviteName: inviteName || undefined,
        }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '문의 전달에 실패했습니다.');
      }

      const payload = (await response.json()) as AskUnknownQuestionResponse;
      if (payload.sessionId && payload.sessionId !== sessionId) {
        setSessionId(payload.sessionId);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SESSION_STORAGE_KEY, payload.sessionId);
        }
      }

      appendMessages(
        buildMessage(
          'system',
          payload.message ||
            '질문을 관리자에게 전달했습니다. 답변이 오면 바로 알려드릴게요.',
        ),
      );
    } catch (error) {
      appendMessages(
        buildMessage(
          'system',
          error instanceof Error
            ? error.message
            : '문의 전달 중 오류가 발생했습니다.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className='thinking-chatbot' aria-label='질문 챗봇'>
      <header className='thinking-chatbot-head'>
        <h2>질문 챗봇</h2>
        <p>
          버튼을 눌러 많이 묻는 질문을 확인해주세요. <br />
          목록에 없는 질문은 채팅을 통해 질문해주시면 가능한 빠른 시간 내에 답변
          드리겠습니다 !
        </p>
      </header>

      <div className='thinking-chatbot-presets'>
        {PRESET_QUESTIONS.map((item) => (
          <button
            key={item.id}
            type='button'
            className='thinking-chatbot-chip'
            onClick={() => handlePresetQuestion(item)}
          >
            {item.question}
          </button>
        ))}
      </div>
      <p className='thinking-chatbot-status'>실시간 상태: {connectionStatus}</p>

      <div
        ref={streamRef}
        className='thinking-chatbot-stream'
        role='log'
        aria-live='polite'
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`thinking-chatbot-message ${message.role}`}
          >
            {typeof message.text === 'string' ? (
              <p className='thinking-chatbot-message-text'>{message.text}</p>
            ) : (
              message.text.map((text) => (
                <p className='thinking-chatbot-message-text' key={text}>
                  {text}
                </p>
              ))
            )}
          </div>
        ))}

        <form
          className='thinking-chatbot-form'
          onSubmit={submitUnknownQuestion}
        >
          <input
            className='thinking-chatbot-input'
            placeholder='궁금한 내용을 질문해 주세요 :)'
            value={questionInput}
            onChange={(event) => setQuestionInput(event.target.value)}
            maxLength={300}
          />
          <button
            type='submit'
            className='thinking-chatbot-send'
            disabled={isSubmitting}
          >
            {isSubmitting ? '전송 중...' : '문의 전송'}
          </button>
        </form>
      </div>
    </section>
  );
}
