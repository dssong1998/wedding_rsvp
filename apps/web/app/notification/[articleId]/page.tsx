import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNotificationArticleDetail,
  getNotificationRelatedArticles
} from "../../../components/article-content";
import { ThinkingDetailPage } from "../../../components/thinking-detail-page";

const OG_IMAGE_PATH = "/assets/images/wedding_poster.jpeg";

type SearchParams = Record<string, string | string[] | undefined>;

type RouteProps = {
  params: Promise<{
    articleId: string;
  }>;
  searchParams?: Promise<SearchParams>;
};

function pickFirstValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function extractInviteValue(searchParams?: SearchParams): string | null {
  const invite = pickFirstValue(searchParams?.invite);
  if (invite) return invite;
  return pickFirstValue(searchParams?.name);
}

function withInviteQuery(href: string, inviteValue: string | null): string {
  if (!inviteValue || !href.startsWith("/")) {
    return href;
  }
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}invite=${encodeURIComponent(inviteValue)}`;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { articleId } = await params;
  const article = getNotificationArticleDetail(articleId);
  if (!article) {
    return {
      title: "결혼식 공지",
      description: "결혼식 당일 전후 공지사항 안내 페이지",
      openGraph: { images: [OG_IMAGE_PATH] },
      twitter: { images: [OG_IMAGE_PATH] }
    };
  }

  return {
    title: `${article.title} | 결혼식 공지`,
    description: article.summary,
    openGraph: { images: [OG_IMAGE_PATH] },
    twitter: { images: [OG_IMAGE_PATH] }
  };
}

export default async function NotificationArticleDetailPage({
  params,
  searchParams
}: RouteProps): Promise<JSX.Element> {
  const { articleId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const article = getNotificationArticleDetail(articleId);
  if (!article) {
    notFound();
  }

  const inviteValue = extractInviteValue(resolvedSearchParams);
  const backHref = withInviteQuery("/notification", inviteValue);
  const relatedArticles = getNotificationRelatedArticles(article.id, 3).map((related) => ({
    ...related,
    href: withInviteQuery(related.href, inviteValue)
  }));

  const resolvedArticle = {
    ...article,
    exploreLinks: article.exploreLinks.map((link) => ({
      ...link,
      href: withInviteQuery(link.href, inviteValue)
    }))
  };

  return (
    <ThinkingDetailPage
      article={resolvedArticle}
      backLink={{ href: backHref, label: "공지 목록으로 돌아가기" }}
      relatedArticles={relatedArticles}
    />
  );
}
