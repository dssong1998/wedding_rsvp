'use client';

import { useEffect, useState } from 'react';
import type { GiftGroup, GiftPerson } from '../data/wedding-gift-data';

type WeddingGiftPageProps = {
  groups: GiftGroup[];
};

function KakaoPayLogo(): JSX.Element {
  return (
    <img
      className='wedding-gift-brand-image kakao'
      src='/assets/icons/kakao.png'
      alt=''
      aria-hidden='true'
    />
  );
}

function TossLogo(): JSX.Element {
  return (
    <img
      className='wedding-gift-brand-image toss'
      src='/assets/icons/toss.png'
      alt=''
      aria-hidden='true'
    />
  );
}

function TossMotion({ src }: { src: string }): JSX.Element {
  return (
    <video
      className='wedding-gift-toss-motion'
      src={src}
      autoPlay
      muted
      playsInline
      preload='auto'
      aria-hidden='true'
      onEnded={(event) => event.currentTarget.pause()}
    />
  );
}

function CopyIcon(): JSX.Element {
  return (
    <img
      className='wedding-gift-copy-image'
      src='/assets/icons/copy.svg'
      alt=''
      aria-hidden='true'
    />
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fallback below
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

function GiftActionButtons({
  person,
  onCopied,
  tossMotionSrc,
}: {
  person: GiftPerson;
  onCopied: (label: string) => void;
  tossMotionSrc: string;
}): JSX.Element {
  const ready = Boolean(person.bank && person.accountNumber);

  return (
    <div className='wedding-gift-actions'>
      <a
        className={`wedding-gift-action kakao${person.kakaoPayUrl ? '' : ' is-disabled'}`}
        href={person.kakaoPayUrl ?? undefined}
        target='_blank'
        rel='noreferrer'
        aria-label={`${person.name} 카카오페이 송금`}
        aria-disabled={!person.kakaoPayUrl}
        onClick={(event) => {
          if (!person.kakaoPayUrl) event.preventDefault();
        }}
      >
        <KakaoPayLogo />
      </a>

      <a
        className={`wedding-gift-action toss${person.tossUrl ? '' : ' is-disabled'}`}
        href={person.tossUrl ?? undefined}
        aria-label={`${person.name} 토스 송금`}
        aria-disabled={!person.tossUrl}
        onClick={(event) => {
          if (!person.tossUrl) event.preventDefault();
        }}
      >
        <TossMotion src={tossMotionSrc} />
      </a>

      <button
        type='button'
        className={`wedding-gift-action copy${ready ? '' : ' is-disabled'}`}
        aria-label={`${person.name} 계좌번호 복사`}
        disabled={!ready}
        onClick={async () => {
          if (!person.bank || !person.accountNumber) return;
          const text = `${person.bank} ${person.accountNumber}`;
          const ok = await copyText(text);
          if (ok) onCopied(`${person.name} 계좌번호를 복사했습니다.`);
        }}
      >
        <CopyIcon />
      </button>
    </div>
  );
}

export function WeddingGiftPage({ groups }: WeddingGiftPageProps): JSX.Element {
  const [backHref, setBackHref] = useState('/information/guide');
  const [toast, setToast] = useState<string | null>(null);
  const [tossMotionSrc, setTossMotionSrc] = useState<string | null>(null);
  const [motionLoadError, setMotionLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    void fetch('/assets/icons/toss_motion.mp4', {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`토스 모션을 불러오지 못했습니다: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setTossMotionSrc(objectUrl);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error(error);
          setMotionLoadError(true);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite') || params.get('name');
    if (!invite) return;
    setBackHref(`/information/guide?invite=${encodeURIComponent(invite)}`);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!tossMotionSrc) {
    return (
      <main className='public-loading-root' aria-busy='true' aria-live='polite'>
        <div className='public-loading-card'>
          {motionLoadError ? null : <div className='public-loading-spinner' />}
          <p>
            {motionLoadError
              ? '토스 송금 모션을 불러오지 못했습니다. 페이지를 새로고침해 주세요.'
              : '송금 화면을 준비하고 있습니다...'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className='wedding-gift-root'>
      <div className='wedding-gift-shell'>
        <a className='wedding-gift-back' href={backHref}>
          <span aria-hidden>←</span>
          <span>가이드로 돌아가기</span>
        </a>

        <header className='wedding-gift-hero'>
          <p className='wedding-gift-kicker'>축의금</p>
          <h1>마음 전하기</h1>
          <p>
            전해주신 마음 감사합니다.
            <br />
            신랑과 신부의 행복한 결혼생활을 위해 잘 사용하겠습니다.
          </p>
        </header>

        <div className='wedding-gift-legend' aria-hidden='true'>
          <span className='wedding-gift-legend-item kakao'>
            <KakaoPayLogo />
            카카오
          </span>
          <span className='wedding-gift-legend-item toss'>
            <TossLogo />
            토스
          </span>
          <span className='wedding-gift-legend-item copy'>
            <CopyIcon />
            복사
          </span>
        </div>

        {groups.map((group) => (
          <section key={group.id} className='wedding-gift-group'>
            <h2>{group.title}</h2>
            <ul className='wedding-gift-list'>
              {group.people.map((person) => {
                const hasAccount = Boolean(person.bank && person.accountNumber);
                return (
                  <li key={person.id} className='wedding-gift-card'>
                    <div className='wedding-gift-card-text'>
                      <div className='wedding-gift-card-head'>
                        <strong>{person.name}</strong>
                        <span>{person.role}</span>
                      </div>
                      {hasAccount ? (
                        <p className='wedding-gift-account'>
                          {person.bank} {person.accountNumber}
                        </p>
                      ) : (
                        <p className='wedding-gift-account pending'>
                          축의금은 마음만 받겠습니다.
                        </p>
                      )}
                    </div>
                    <GiftActionButtons
                      person={person}
                      onCopied={setToast}
                      tossMotionSrc={tossMotionSrc}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {toast ? (
        <div className='wedding-gift-toast' role='status' aria-live='polite'>
          {toast}
        </div>
      ) : null}
    </main>
  );
}
