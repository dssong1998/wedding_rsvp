"use client";

import { NOTIFICATION_FEATURED_ARTICLES, NOTIFICATION_SECTIONS } from "./article-content";
import { ThinkingArticlePage } from "./thinking-article-page";

export function NotificationPage(): JSX.Element {
  return (
    <ThinkingArticlePage
      currentPage="notification"
      eyebrow="결혼식 공지"
      title={
        <>
          <span className="thinking-title-accent">최신 공지</span>와 업데이트를
          <br />
          한 화면에서 확인하세요.
        </>
      }
      description="당일 전후로 바뀔 수 있는 안내를 공지형 아티클로 모아 빠르게 확인할 수 있게 구성했습니다."
      featuredTitle="주요 공지"
      featuredArticles={NOTIFICATION_FEATURED_ARTICLES}
      sections={NOTIFICATION_SECTIONS}
    />
  );
}
