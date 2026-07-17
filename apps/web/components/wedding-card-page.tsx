'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

const DUPLICATE_GALLERY_IDS = new Set([1, 6, 9, 13, 21, 26]);

const GALLERY_IMAGES = Array.from({ length: 45 }, (_, index) => index + 1)
  .filter((id) => !DUPLICATE_GALLERY_IDS.has(id))
  .map((id) => `/assets/images/gallery/pic-${id}.jpg`);

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ??
  'http://localhost:4000';
const GUEST_NAME_KEY = 'wedding-card-guest-name';

type GuestMessage = {
  id: number;
  nickname: string;
  message: string;
  createdAt: string;
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function SectionHeader({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <header className='wedding-card-section-header'>
      <img
        src='/assets/images/wedding-card/section-title.png'
        alt=''
        aria-hidden='true'
      />
      <h2>{children}</h2>
    </header>
  );
}

function Gallery({
  activeImage,
  onSelect,
  onOpen,
}: {
  activeImage: string;
  onSelect: (image: string) => void;
  onOpen: (image: string) => void;
}): JSX.Element {
  return (
    <div className='wedding-card-gallery'>
      <button
        type='button'
        className='wedding-card-gallery-main'
        onClick={() => onOpen(activeImage)}
        aria-label='선택한 갤러리 사진 크게 보기'
      >
        <img src={activeImage} alt='대석과 다인의 사진' />
      </button>
      <div
        className='wedding-card-gallery-thumbnails'
        aria-label='갤러리 사진 선택'
      >
        {GALLERY_IMAGES.map((image, index) => (
          <button
            key={image}
            type='button'
            className={image === activeImage ? 'is-selected' : ''}
            aria-label={`갤러리 사진 ${index + 1} 선택`}
            aria-pressed={image === activeImage}
            onClick={() => onSelect(image)}
          >
            <img src={image} alt='' loading='lazy' />
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoLightbox({
  image,
  onClose,
  onPrevious,
  onNext,
}: {
  image: string;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}): JSX.Element {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrevious();
      if (event.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  function beginSwipe(clientX: number, clientY: number): void {
    touchStartRef.current = { x: clientX, y: clientY };
  }

  function endSwipe(clientX: number, clientY: number): void {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) onNext();
    else onPrevious();
  }

  return (
    <div
      className='wedding-card-lightbox'
      role='dialog'
      aria-modal='true'
      aria-label='갤러리 사진'
    >
      <button
        type='button'
        className='wedding-card-lightbox-backdrop'
        onClick={onClose}
        aria-label='닫기'
      />
      <figure
        className='wedding-card-lightbox-content'
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button')) return;
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          beginSwipe(event.clientX, event.clientY);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button')) return;
          endSwipe(event.clientX, event.clientY);
        }}
        onPointerCancel={() => {
          touchStartRef.current = null;
        }}
      >
        <button
          type='button'
          className='wedding-card-lightbox-nav is-previous'
          onClick={onPrevious}
          aria-label='이전 사진'
        >
          ‹
        </button>
        <button
          type='button'
          className='wedding-card-lightbox-close'
          onClick={onClose}
          aria-label='닫기'
        >
          ×
        </button>
        <img
          key={image}
          src={image}
          alt='대석과 다인의 사진'
          draggable={false}
        />
        <button
          type='button'
          className='wedding-card-lightbox-nav is-next'
          onClick={onNext}
          aria-label='다음 사진'
        >
          ›
        </button>
      </figure>
    </div>
  );
}

export function WeddingCardPage({
  publicHome = false,
}: {
  publicHome?: boolean;
}): JSX.Element {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState(
    GALLERY_IMAGES[0],
  );
  const [inviteName, setInviteName] = useState('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showNameForm, setShowNameForm] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [guestbookNear, setGuestbookNear] = useState(false);
  const [composerBusy, setComposerBusy] = useState(false);
  const [composerFeedback, setComposerFeedback] = useState<string | null>(null);
  const guestbookRef = useRef<HTMLElement | null>(null);
  const composerVisible =
    guestbookNear || Boolean(draftMessage.trim()) || showNameForm;

  function navigateLightbox(offset: number): void {
    if (!selectedImage) return;
    const currentIndex = GALLERY_IMAGES.indexOf(selectedImage);
    const nextIndex =
      (currentIndex + offset + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
    const nextImage = GALLERY_IMAGES[nextIndex];
    setSelectedImage(nextImage);
    setActiveGalleryImage(nextImage);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite') ?? params.get('name');
    if (invite) {
      setInviteName(invite.replace(/^invited@/i, ''));
    }
    const savedName = window.localStorage.getItem(GUEST_NAME_KEY)?.trim() ?? '';
    if (savedName) setGuestName(savedName);
  }, []);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  useEffect(() => {
    let cancelled = false;
    async function loadMessages(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE}/guest-messages?limit=20`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: GuestMessage[] };
        if (!cancelled && Array.isArray(payload.items)) {
          setMessages(payload.items);
        }
      } catch {
        // 메시지 목록 로드 실패 시에도 입력 UI는 유지한다.
      }
    }
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const target = guestbookRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setGuestbookNear(
          entry.isIntersecting ||
            entry.boundingClientRect.top < window.innerHeight * 0.55,
        );
      },
      { root: null, threshold: [0, 0.05, 0.2], rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  async function shareInvitation(): Promise<void> {
    const shareData = {
      title: publicHome
        ? '송대석♡김다인의 결혼 소식을 전합니다.'
        : '송대석♡김다인의 결혼식에 초대합니다.',
      text: publicHome
        ? '2026년 8월 22일, 송대석과 김다인이 결혼합니다.'
        : '2026년 8월 22일 토요일 오후 5시 · 보넬리가든',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setShareNotice('청첩장 주소를 복사했습니다.');
    } catch {
      // 사용자가 공유 창을 닫은 경우를 포함해 별도 안내하지 않는다.
    }
  }

  function shareToKakaoStory(): void {
    const message = encodeURIComponent(
      `송대석♡김다인의 결혼식에 초대합니다.\n${window.location.href}`,
    );
    window.open(
      `https://story.kakao.com/share?url=${message}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function requestSubmit(): void {
    const message = draftMessage.trim();
    setComposerFeedback(null);
    if (!message) {
      setComposerFeedback('축하 메시지를 입력해 주세요.');
      return;
    }
    if (!guestName.trim()) {
      setNameDraft('');
      setShowNameForm(true);
      return;
    }
    void submitMessage(guestName.trim(), message);
  }

  async function submitMessage(
    nickname: string,
    message: string,
  ): Promise<void> {
    if (composerBusy) return;
    setComposerBusy(true);
    setComposerFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/guest-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          message,
          inviteName: inviteName || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        setComposerFeedback(
          body || '메시지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return;
      }
      const saved = (await response.json()) as GuestMessage;
      setMessages((prev) => [saved, ...prev]);
      setDraftMessage('');
      setShowNameForm(false);
      window.localStorage.setItem(GUEST_NAME_KEY, nickname);
      setGuestName(nickname);
      setComposerFeedback(`${nickname}님의 축하 메시지가 등록되었습니다.`);
    } catch {
      setComposerFeedback('메시지 저장 중 오류가 발생했습니다.');
    } finally {
      setComposerBusy(false);
    }
  }

  function handleNameFormSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nickname = nameDraft.trim();
    const message = draftMessage.trim();
    if (nickname.length < 2) {
      setComposerFeedback('이름을 2자 이상 입력해 주세요.');
      return;
    }
    if (!message) {
      setComposerFeedback('축하 메시지를 입력해 주세요.');
      return;
    }
    void submitMessage(nickname, message);
  }

  const messagePlaceholder = guestName
    ? `${guestName}님, 축하 메시지를 남겨주세요`
    : '축하 메시지를 남겨주세요';

  return (
    <main
      className={`wedding-card-root${composerVisible ? ' has-composer' : ''}`}
    >
      <article className='wedding-card-sheet'>
        <section className='wedding-card-hero'>
          <img
            className='wedding-card-hero-photo'
            src='/assets/images/wedding-card/hero-photo.jpg'
            alt='송대석과 김다인'
          />
          <img
            className='wedding-card-hero-title'
            src='/assets/images/wedding-card/hero-title.png'
            alt=''
            aria-hidden='true'
          />
          <div className='wedding-card-hero-details'>
            <div className='wedding-card-hero-names'>
              <span>김다인</span>
              <span>송대석</span>
            </div>
            <div className='wedding-card-hero-meta'>
              <p>2026년 8월 22일 토요일 오후 5시</p>
              {!publicHome ? <p>보넬리 가든</p> : null}
            </div>
          </div>
        </section>

        <section className='wedding-card-section wedding-card-greeting'>
          <SectionHeader>결혼합니다</SectionHeader>
          <div className='wedding-card-section-body'>
            <p className='wedding-card-greeting-copy'>
              딸을 얻는 기쁨으로
              <br />
              아들을 얻는 행복으로
              <br />
              두 집안이 가약을 맺고자 합니다.
              <br />
              아름다운 사랑으로 날개를 펴는 이들에게
              <br />
              축복과 격려 부탁드립니다.
            </p>
            <table className='wedding-card-family'>
              <tbody>
                <tr>
                  <td className='wedding-card-family-parents'>
                    <div>송기재</div>
                    <div>주현숙</div>
                  </td>
                  <td className='wedding-card-family-rel'>의</td>
                  <td className='wedding-card-family-ord'>장남</td>
                  <td className='wedding-card-family-self'>송대석</td>
                </tr>
                <tr>
                  <td className='wedding-card-family-parents'>
                    <div>김현철</div>
                    <div>강민경</div>
                  </td>
                  <td className='wedding-card-family-rel'>의</td>
                  <td className='wedding-card-family-ord'>차녀</td>
                  <td className='wedding-card-family-self'>김다인</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className='wedding-card-section wedding-card-contact'>
          <SectionHeader>축하 연락처</SectionHeader>
          <div className='wedding-card-section-body wedding-card-contact-list'>
            {[
              { name: '송대석', phone: '01071414724' },
              { name: '김다인', phone: '01040853516' },
            ].map((person) => (
              <div key={person.name} className='wedding-card-contact-row'>
                <strong>{person.name}</strong>
                <div>
                  <a
                    href={`tel:${person.phone}`}
                    aria-label={`${person.name}에게 전화`}
                  >
                    <img
                      src='/assets/images/wedding-card/contact-tel.png'
                      alt=''
                      aria-hidden='true'
                    />
                  </a>
                  <a
                    href={`sms:${person.phone}`}
                    aria-label={`${person.name}에게 문자`}
                  >
                    <img
                      src='/assets/images/wedding-card/contact-msg.png'
                      alt=''
                      aria-hidden='true'
                    />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className='wedding-card-section wedding-card-gallery-section'>
          <SectionHeader>갤러리</SectionHeader>
          <Gallery
            activeImage={activeGalleryImage}
            onSelect={setActiveGalleryImage}
            onOpen={setSelectedImage}
          />
        </section>

        {publicHome ? (
          <section className='wedding-card-section wedding-card-private-notice'>
            <SectionHeader>안내 말씀</SectionHeader>
            <div className='wedding-card-section-body'>
              <p>
                저희의 결혼식은 가족과 친척분들만 모시고
                <br />
                소규모로 진행될 예정입니다.
              </p>
              <p>
                더 많은 분을 직접 모시지 못하는 점
                <br />
                너른 마음으로 양해 부탁드리며,
                <br />
                멀리서 보내주시는 축복과 응원도
                <br />
                감사히 간직하겠습니다.
              </p>
            </div>
          </section>
        ) : (
          <section className='wedding-card-section wedding-card-location'>
            <SectionHeader>오시는 길</SectionHeader>
            <div className='wedding-card-section-body'>
              <div className='wedding-card-venue'>
                <strong>보넬리 가든</strong>
                <span>서울 서초구 샘마루길 11</span>
              </div>
              <div className='wedding-card-map'>
                <iframe
                  title='보넬리 가든 위치'
                  src='https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357ca73d519626f1%3A0x192517babf361b17!2z67O064Ss66as6rCA65Og!5e0!3m2!1sko!2skr!4v1784271976734!5m2!1sko!2skr'
                  loading='lazy'
                  referrerPolicy='strict-origin-when-cross-origin'
                  allowFullScreen
                />
              </div>
              <div className='wedding-card-map-links'>
                <a
                  href='https://naver.me/GYCqKhaF'
                  target='_blank'
                  rel='noreferrer'
                >
                  네이버 지도
                </a>
                <a
                  href='https://map.kakao.com/link/map/보넬리 가든,37.45579,127.07108'
                  target='_blank'
                  rel='noreferrer'
                >
                  카카오맵
                </a>
                <a
                  href='https://maps.app.goo.gl/4NSCoPqm2jLcHzL49'
                  target='_blank'
                  rel='noreferrer'
                >
                  구글 지도
                </a>
              </div>
              <dl className='wedding-card-directions'>
                <div>
                  <dt>지하철</dt>
                  <dd>신분당선 양재시민의숲역 4번 출구 · 셔틀 운행</dd>
                </div>
                <div>
                  <dt>주차</dt>
                  <dd>서초과학화예비군훈련장 강동송파주차장 이용</dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {!publicHome ? (
          <section className='wedding-card-section wedding-card-gift'>
            <SectionHeader>축하의 마음 전하기</SectionHeader>
            <div className='wedding-card-section-body'>
              <p>
                따뜻한 축하와 마음에 깊이 감사드립니다.
                <br />
                보내주신 마음 오래도록 소중히 간직하겠습니다.
              </p>
              <a href='/wedding-gift'>축의금 보내기</a>
            </div>
          </section>
        ) : null}

        <section
          className='wedding-card-section wedding-card-guestbook'
          ref={guestbookRef}
        >
          <SectionHeader>축하 메시지</SectionHeader>
          <div className='wedding-card-section-body'>
            {messages.length === 0 ? (
              <p className='wedding-card-guestbook-empty'>
                아직 남겨진 메시지가 없습니다. 첫 메시지를 남겨주세요.
              </p>
            ) : (
              <div className='wedding-card-message-list'>
                {messages.map((item) => (
                  <article key={item.id} className='wedding-card-message'>
                    <div className='wedding-card-message-head'>
                      <strong>{item.nickname}</strong>
                      <time dateTime={item.createdAt}>
                        {formatRelativeTime(item.createdAt)}
                      </time>
                    </div>
                    <p>{item.message}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className='wedding-card-section wedding-card-share'>
          <SectionHeader>소식공유</SectionHeader>
          <div className='wedding-card-section-body'>
            <div className='wedding-card-share-buttons'>
              <button type='button' onClick={() => void shareInvitation()}>
                <img
                  src='/assets/images/wedding-card/share-kakao.png'
                  alt=''
                  aria-hidden='true'
                />
                <span>카카오톡 공유</span>
              </button>
            </div>
            <p className='wedding-card-thanks'>
              Thank you!
              <span aria-hidden='true'>♥</span>
            </p>
          </div>
        </section>

        <footer className='wedding-card-footer'>
          <p>송대석 ♡ 김다인</p>
          {!publicHome ? <a href='/information'>결혼식 정보 보기</a> : null}
        </footer>
      </article>

      <div
        className={`wedding-card-reply${composerVisible ? ' is-visible' : ''}`}
        aria-hidden={!composerVisible}
      >
        {showNameForm ? (
          <form
            className='wedding-card-reply-name-form'
            onSubmit={handleNameFormSubmit}
          >
            <p>이름을 입력하시면 등록이 완료됩니다!</p>
            <input
              type='text'
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={40}
              placeholder='이름(본인이름)'
              autoComplete='name'
              autoFocus
            />
            <div className='wedding-card-reply-name-actions'>
              <button
                type='button'
                onClick={() => setShowNameForm(false)}
                disabled={composerBusy}
              >
                취소
              </button>
              <button type='submit' disabled={composerBusy}>
                등록하기
              </button>
            </div>
          </form>
        ) : (
          <div className='wedding-card-reply-row'>
            <textarea
              className={`wedding-card-reply-input${draftMessage.trim() ? '' : ' has-heart'}`}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={messagePlaceholder}
              maxLength={150}
              rows={1}
              aria-label='축하 메시지 입력'
            />
            <button
              type='button'
              className='wedding-card-reply-submit'
              onClick={requestSubmit}
              disabled={composerBusy || !draftMessage.trim()}
            >
              등록하기
            </button>
          </div>
        )}
        {composerFeedback ? (
          <p className='wedding-card-reply-feedback'>{composerFeedback}</p>
        ) : null}
      </div>

      {selectedImage ? (
        <PhotoLightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onPrevious={() => navigateLightbox(-1)}
          onNext={() => navigateLightbox(1)}
        />
      ) : null}
      {shareNotice ? (
        <div className='wedding-card-share-notice' role='status'>
          {shareNotice}
        </div>
      ) : null}
    </main>
  );
}
