"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ArticleCardData, ArticleSectionData } from "./article-content";

type ThinkingArticlePageProps = {
  currentPage: "information" | "notification";
  eyebrow: string;
  title: ReactNode;
  description: string;
  featuredTitle: string;
  featuredArticles: ArticleCardData[];
  sections: ArticleSectionData[];
  showTopNavigation?: boolean;
  bottomArrowNavigation?: {
    left?: {
      href: string;
      label: string;
    };
    right?: {
      href: string;
      label: string;
    };
  };
};

function ArticleCard({
  article,
  compact = false,
  resolveHref
}: {
  article: ArticleCardData;
  compact?: boolean;
  resolveHref: (href: string) => string;
}): JSX.Element {
  const cardClass = compact ? "thinking-article-card compact" : "thinking-article-card";
  const resolvedHref = resolveHref(article.href);

  return (
    <article className={cardClass} onClick={() => window.location.href = resolvedHref}>
      <div className="thinking-article-media">
        <img src={article.image} alt={article.title} loading="lazy" />
      </div>
      <div className="thinking-article-body">
        <div className="thinking-article-meta">
          <span>{article.tag}</span>
          <span>{article.reading}</span>
        </div>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
        <a className="thinking-article-link">
          자세히 보기
        </a>
      </div>
    </article>
  );
}

export function ThinkingArticlePage({
  currentPage,
  eyebrow,
  title,
  description,
  featuredTitle,
  featuredArticles,
  sections,
  showTopNavigation = true,
  bottomArrowNavigation
}: ThinkingArticlePageProps): JSX.Element {
  const [inviteValue, setInviteValue] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    const name = params.get("name");
    if (invite) {
      setInviteValue(invite);
      return;
    }
    if (name) {
      setInviteValue(name);
      return;
    }
    setInviteValue(null);
  }, []);

  const mainFeatured = featuredArticles[0];
  const secondaryFeatured = featuredArticles.slice(1);
  const feedArticles = useMemo(() => {
    return sections.flatMap((section) => section.articles);
  }, [sections]);

  const resolveHref = (href: string): string => {
    if (!inviteValue || !href.startsWith("/")) {
      return href;
    }
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}invite=${encodeURIComponent(inviteValue)}`;
  };

  const informationHref = resolveHref("/information");
  const notificationHref = resolveHref("/notification");
  const funHref = resolveHref("/fun");

  return (
    <main className="thinking-root">
      <div className="thinking-shell">
        {showTopNavigation ? (
          <header className="thinking-nav">
            <a className="thinking-brand" href="/">
              다인 &amp; 대석
            </a>
            <div className="thinking-nav-links">
              <a
                className={currentPage === "information" ? "thinking-nav-link active" : "thinking-nav-link"}
                href={informationHref}
              >
                안내사항
              </a>
              <a
                className={currentPage === "notification" ? "thinking-nav-link active" : "thinking-nav-link"}
                href={notificationHref}
              >
                공지
              </a>
              <a className="thinking-nav-link" href={funHref}>
                즐길거리
              </a>
            </div>
          </header>
        ) : null}

        <section className="thinking-hero">
          <p className="thinking-eyebrow">{eyebrow}</p>
          <h1 className="thinking-title">{title}</h1>
          <p className="thinking-description">{description}</p>
        </section>

        <section className="thinking-featured">
          <h2>{featuredTitle}</h2>
          <div className="thinking-featured-grid">
            {mainFeatured ? <ArticleCard article={mainFeatured} resolveHref={resolveHref} /> : null}
            {/* <div className="thinking-featured-side"> */}
              {secondaryFeatured.map((article) => (
                <ArticleCard key={article.id} article={article} resolveHref={resolveHref} />
              ))}
            {/* </div> */}
          </div>
        </section>

        <section className="thinking-sections">
          <section className="thinking-section-head thinking-section-head-outside" aria-label="피드 섹션 안내">
            <h2>상세 정보</h2>
            <p>필요한 정보를 바로 찾아서 확인하세요</p>
          </section>

          {/* <div className="thinking-section-panel thinking-section-feed-panel">
            <div className="thinking-feed-list">
              {feedArticles.map((article) => (
                <ArticleCard key={article.id} article={article} resolveHref={resolveHref} />
              ))}
            </div>
          </div> */}
        </section>

        {bottomArrowNavigation ? (
          <nav className="thinking-bottom-nav" aria-label="하단 페이지 이동">
            {bottomArrowNavigation.left ? (
              <a className="thinking-bottom-arrow" href={resolveHref(bottomArrowNavigation.left.href)}>
                <span className="thinking-bottom-arrow-icon" aria-hidden>
                  ←
                </span>
                <span className="thinking-bottom-arrow-label">{bottomArrowNavigation.left.label}</span>
              </a>
            ) : (
              <div />
            )}

            {bottomArrowNavigation.right ? (
              <a
                className="thinking-bottom-arrow right"
                href={resolveHref(bottomArrowNavigation.right.href)}
              >
                <span className="thinking-bottom-arrow-label">{bottomArrowNavigation.right.label}</span>
                <span className="thinking-bottom-arrow-icon" aria-hidden>
                  →
                </span>
              </a>
            ) : (
              <div />
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
