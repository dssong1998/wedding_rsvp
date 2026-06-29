"use client";

import { useMemo, useState } from "react";

type Language = "ko" | "en";

const LETTERS: Record<Language, string> = {
  ko: `사랑은 삶에서 끊임없이 고민해야하는 주제임에도,
더이상 그것을 고민하지 않고 있음을 깨달았을 때.
그제야 비로소 사랑이 무엇인지 이해할 수 있었습니다.
그래서 이 사랑의 출처인 사람들과 함께
아름다움을 이야기 해 보려 합니다.
8월 22일 여름의 정원에서.

다인과 대석 드림`,
  en: `Though love is a question we are meant to ponder all our lives,
it was the moment we realized we no longer dwelt on it
that we finally came to understand what love truly is.
And so, together with those from whom this love first came,
we wish to speak of its beauty.
On the 22nd of August, in a garden in summer.

With love, Dain & Daeseok`
};

const COPY: Record<
  Language,
  {
    title: string;
    subtitle: string;
    letterTitle: string;
    accountsTitle: string;
    accountLabel: string;
    mapsTitle: string;
    mapCta: string;
    footer: string;
  }
> = {
  ko: {
    title: "DAIN + DAESEOK",
    subtitle: "아름다움을 이야기 해 보려 합니다",
    letterTitle: "편지",
    accountsTitle: "축의금 계좌",
    accountLabel: "예금주",
    mapsTitle: "오시는 길",
    mapCta: "네이버 지도로 길찾기",
    footer: "초대받은 손님 전용 청첩장은 개인 링크로 접속해 주세요."
  },
  en: {
    title: "DAIN + DAESEOK",
    subtitle: "A small note of love",
    letterTitle: "Letter",
    accountsTitle: "Gift Accounts",
    accountLabel: "Account Holder",
    mapsTitle: "Directions",
    mapCta: "Open Naver Map",
    footer: "Wedding details are available only via personal invite links."
  }
};

const ACCOUNTS = [
  { side: "신랑측", bank: "우리은행", number: "1002-133-822329", holder: "송대석" },
  { side: "신부측", bank: "우리은행", number: "3333-33-333333", holder: "김다인" }
];

export function PublicPage(): JSX.Element {
  const [lang, setLang] = useState<Language>("ko");
  const copy = useMemo(() => COPY[lang], [lang]);

  return (
    <main className="public-root">
      <div className="public-wrap">
        <section className="public-card">
          <div className="public-hero" />
          <h1 style={{ marginTop: 16 }}>{copy.title}</h1>
          <p className="public-muted">{copy.subtitle}</p>
          <div style={{ marginTop: 12 }} className="lang-toggle">
            <button
              type="button"
              className={lang === "ko" ? "active" : ""}
              onClick={() => setLang("ko")}
            >
              한국어
            </button>
            <button
              type="button"
              className={lang === "en" ? "active" : ""}
              onClick={() => setLang("en")}
            >
              English
            </button>
          </div>
        </section>

        <section className="public-card">
          <h2>{copy.letterTitle}</h2>
          <p className="public-letter">{LETTERS[lang]}</p>
        </section>

        <section className="public-card">
          <h2>{copy.accountsTitle}</h2>
          <ul className="gift-list">
            {ACCOUNTS.map((account) => (
              <li key={account.side} className="gift-item">
                <strong>{account.side}</strong>
                <span>
                  {account.bank} {account.number}
                </span>
                <span>
                  {copy.accountLabel}: {account.holder}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="public-card">
          <h2>{copy.mapsTitle}</h2>
          <p className="public-muted">37.455800, 127.071087</p>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <a href="https://naver.me/GYCqKhaF" target="_blank" rel="noreferrer">
              {copy.mapCta}
            </a>
          </p>
        </section>

        <p className="public-footer">{copy.footer}</p>
      </div>
    </main>
  );
}
