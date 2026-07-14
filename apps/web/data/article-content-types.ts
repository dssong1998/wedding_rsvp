export type ArticlePageKind = "information" | "notification";

export type ArticleCardData = {
  id: string;
  title: string;
  summary: string;
  image: string;
  tag: string;
  reading: string;
  href: string;
};

export type ArticleSectionData = {
  id: string;
  label: string;
  title: string;
  description: string;
  articles: ArticleCardData[];
};

export type ArticleDetailBlock = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  quote?: string;
  linkButton?: ArticleLink;
};

export type ArticleLink = {
  label: string;
  href: string;
};

export type ArticleDetailData = {
  id: string;
  page: ArticlePageKind;
  title: string;
  summary: string;
  image: string;
  tag: string;
  reading: string;
  author: string;
  publishedOn: string;
  lead: string;
  blocks: ArticleDetailBlock[];
  exploreLinks: ArticleLink[];
};

export type ArticleDetailContent = Pick<ArticleDetailData, "lead" | "blocks" | "exploreLinks"> &
  Partial<Pick<ArticleDetailData, "author" | "publishedOn">>;
