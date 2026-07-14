import type {
  ArticleCardData,
  ArticleDetailContent,
  ArticleDetailData,
  ArticlePageKind,
  ArticleSectionData
} from "./article-content-types";
import {
  INFORMATION_DETAIL_CONTENT,
  INFORMATION_FEATURED_ARTICLES,
  INFORMATION_SECTIONS
} from "./information-content-data";
import {
  NOTIFICATION_DETAIL_CONTENT,
  NOTIFICATION_FEATURED_ARTICLES,
  NOTIFICATION_SECTIONS
} from "./notification-content-data";

export type {
  ArticleCardData,
  ArticleDetailBlock,
  ArticleDetailContent,
  ArticleDetailData,
  ArticleLink,
  ArticlePageKind,
  ArticleSectionData
} from "./article-content-types";

export {
  INFORMATION_DETAIL_CONTENT,
  INFORMATION_FEATURED_ARTICLES,
  INFORMATION_SECTIONS,
  NOTIFICATION_DETAIL_CONTENT,
  NOTIFICATION_FEATURED_ARTICLES,
  NOTIFICATION_SECTIONS
};

const DEFAULT_AUTHOR = "다인 · 대석 웨딩팀";
const DEFAULT_PUBLISHED_AT = "2026.07.11 업데이트";

function uniqueArticles(
  featured: ArticleCardData[],
  sections: ArticleSectionData[]
): ArticleCardData[] {
  const byId = new Map<string, ArticleCardData>();
  for (const article of featured) {
    byId.set(article.id, article);
  }
  for (const section of sections) {
    for (const article of section.articles) {
      if (!byId.has(article.id)) {
        byId.set(article.id, article);
      }
    }
  }
  return Array.from(byId.values());
}

function buildDetails(
  page: ArticlePageKind,
  articles: ArticleCardData[],
  detailContent: Record<string, ArticleDetailContent>
): Record<string, ArticleDetailData> {
  return Object.fromEntries(
    articles.map((article) => {
      const content = detailContent[article.id];
      if (!content) {
        throw new Error(`[article-content] Missing detail content for "${article.id}"`);
      }
      const detail: ArticleDetailData = {
        id: article.id,
        page,
        title: article.title,
        summary: article.summary,
        image: article.image,
        tag: article.tag,
        reading: article.reading,
        author: content.author ?? DEFAULT_AUTHOR,
        publishedOn: content.publishedOn ?? DEFAULT_PUBLISHED_AT,
        lead: content.lead,
        blocks: content.blocks,
        exploreLinks: content.exploreLinks
      };
      return [article.id, detail];
    })
  );
}

const INFORMATION_ALL_ARTICLES = uniqueArticles(
  INFORMATION_FEATURED_ARTICLES,
  INFORMATION_SECTIONS
);
const NOTIFICATION_ALL_ARTICLES = uniqueArticles(
  NOTIFICATION_FEATURED_ARTICLES,
  NOTIFICATION_SECTIONS
);

const INFORMATION_DETAILS = buildDetails(
  "information",
  INFORMATION_ALL_ARTICLES,
  INFORMATION_DETAIL_CONTENT
);
const NOTIFICATION_DETAILS = buildDetails(
  "notification",
  NOTIFICATION_ALL_ARTICLES,
  NOTIFICATION_DETAIL_CONTENT
);

export function getInformationArticleOrder(): string[] {
  return INFORMATION_ALL_ARTICLES.map((article) => article.id);
}

export function getNotificationArticleOrder(): string[] {
  return NOTIFICATION_ALL_ARTICLES.map((article) => article.id);
}

export function getInformationArticleDetail(
  articleId: string
): ArticleDetailData | undefined {
  return INFORMATION_DETAILS[articleId];
}

export function getNotificationArticleDetail(
  articleId: string
): ArticleDetailData | undefined {
  return NOTIFICATION_DETAILS[articleId];
}

export function getInformationRelatedArticles(
  currentArticleId: string,
  limit = 3
): ArticleCardData[] {
  return INFORMATION_ALL_ARTICLES.filter((article) => article.id !== currentArticleId).slice(
    0,
    limit
  );
}

export function getNotificationRelatedArticles(
  currentArticleId: string,
  limit = 3
): ArticleCardData[] {
  return NOTIFICATION_ALL_ARTICLES.filter((article) => article.id !== currentArticleId).slice(
    0,
    limit
  );
}
