'use client';

import {
  INFORMATION_FEATURED_ARTICLES,
  INFORMATION_SECTIONS,
} from './article-content';
import { ThinkingArticlePage } from './thinking-article-page';

export function InformationPage(): JSX.Element {
  return (
    <ThinkingArticlePage
      currentPage='information'
      eyebrow='결혼식 안내'
      title={
        <>
          <span className='thinking-title-accent'>대석과 다인의 결혼식</span>{' '}
          정보를
          <br />
          확인하실 수 있습니다.
        </>
      }
      description='오시는 길부터 당일의 행사 안내까지 궁금하실만한 정보를 정리해 두었으니 필요한 내용을 참고해주세요.'
      featuredTitle='주요 안내'
      featuredArticles={INFORMATION_FEATURED_ARTICLES}
      sections={INFORMATION_SECTIONS}
      showTopNavigation={false}
      bottomArrowNavigation={{
        left: { href: '/fun?invite=invited%40하객', label: '즐길거리' },
        right: { href: '/wedding-card', label: '모바일 청첩장' },
      }}
    />
  );
}
