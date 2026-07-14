import type {
  ArticleCardData,
  ArticleDetailData,
  ArticleLink
} from "./article-content";

type ThinkingDetailPageProps = {
  article: ArticleDetailData;
  backLink: ArticleLink;
  relatedArticles: ArticleCardData[];
};

function isExternalLink(href: string): boolean {
  return /^https?:\/\//.test(href);
}

export function ThinkingDetailPage({
  article,
  backLink,
  relatedArticles
}: ThinkingDetailPageProps): JSX.Element {
  return (
    <main className="article-detail-root">
      <div className="article-detail-shell">
        <a className="article-detail-back-link" href={backLink.href}>
          <span aria-hidden>←</span>
          <span>{backLink.label}</span>
        </a>

        <article className="article-detail-card">
          <header className="article-detail-hero">
            <p className="article-detail-kicker">{article.tag}</p>
            <h1>{article.title}</h1>
            <p>{article.summary}</p>
          </header>

          <figure className="article-detail-cover">
            <img src={article.image} alt={article.title} loading="eager" />
          </figure>

          {/* <p className="article-detail-lede">{article.lead}</p> */}

          <div className="article-detail-body">
            {article.blocks.map((block) => {
              const actionLink = block.linkButton;
              const externalActionLink = actionLink ? isExternalLink(actionLink.href) : false;

              return (
                <section key={block.heading} className="article-detail-block">
                  <h2>{block.heading}</h2>

                  {block.paragraphs.map((paragraph, index) => (
                    <p key={`${block.heading}-paragraph-${index}`}>{paragraph}</p>
                  ))}

                  {block.quote ? <blockquote>{block.quote}</blockquote> : null}

                  {block.bullets?.length ? (
                    <ul>
                      {block.bullets.map((bullet, index) => (
                        <li key={`${block.heading}-bullet-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}

                  {actionLink ? (
                    <a
                      className="article-detail-block-link-button"
                      href={actionLink.href}
                      target={externalActionLink ? "_blank" : undefined}
                      rel={externalActionLink ? "noreferrer" : undefined}
                    >
                      {actionLink.label}
                    </a>
                  ) : null}
                </section>
              );
            })}
          </div>
        </article>

        {article.exploreLinks.length ? (
          <aside className="article-detail-explore">
            <h2>더 살펴보기</h2>
            <ul>
              {article.exploreLinks.map((link, index) => {
                const external = isExternalLink(link.href);
                return (
                  <li key={`${link.href}-${index}`}>
                    <a
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}

        {relatedArticles.length ? (
          <section className="article-detail-related">
            <h2>같이 보면 좋은 글</h2>
            <div className="article-detail-related-grid">
              {relatedArticles.map((related) => (
                <article key={related.id} className="article-detail-related-card">
                  <div className="article-detail-related-image">
                    <img src={related.image} alt={related.title} loading="lazy" />
                  </div>
                  <div className="article-detail-related-body">
                    <div className="article-detail-related-meta">
                      <span>{related.tag}</span>
                      <span>{related.reading}</span>
                    </div>
                    <h3>{related.title}</h3>
                    <p>{related.summary}</p>
                    <a href={related.href}>읽어보기</a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
