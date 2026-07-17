import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getInformationArticleDetail,
  getInformationRelatedArticles
} from "../../../components/article-content";
import { ThinkingDetailPage } from "../../../components/thinking-detail-page";

const OG_IMAGE_PATH = "/assets/images/wedding_poster.jpeg";

type RouteProps = {
  params: Promise<{
    articleId: string;
  }>;
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { articleId } = await params;
  const article = getInformationArticleDetail(articleId);
  if (!article) {
    return {
      title: "결혼식 안내",
      description: "하객을 위한 결혼식 안내 페이지",
      openGraph: { images: [OG_IMAGE_PATH] },
      twitter: { images: [OG_IMAGE_PATH] }
    };
  }

  return {
    title: `${article.title} | 결혼식 안내`,
    description: article.summary,
    openGraph: { images: [OG_IMAGE_PATH] },
    twitter: { images: [OG_IMAGE_PATH] }
  };
}

export default async function InformationArticleDetailPage({
  params
}: RouteProps): Promise<JSX.Element> {
  const { articleId } = await params;
  const article = getInformationArticleDetail(articleId);
  if (!article) {
    notFound();
  }

  const relatedArticles = getInformationRelatedArticles(article.id, 3);

  return (
    <ThinkingDetailPage
      article={article}
      backLink={{ href: "/information", label: "안내 목록으로 돌아가기" }}
      relatedArticles={relatedArticles}
    />
  );
}
