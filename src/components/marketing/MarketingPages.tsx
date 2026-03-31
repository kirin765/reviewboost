import Link from "next/link";

export interface MarketingCardItem {
  href: string;
  title: string;
  description: string;
  tag?: string;
}

export interface MarketingSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  ordered?: string[];
}

export interface MarketingFaqItem {
  question: string;
  answer: string;
}

export function MarketingHubPage({
  eyebrow,
  title,
  lead,
  cards,
  highlights,
  ctaTitle,
  ctaLead
}: {
  eyebrow: string;
  title: string;
  lead: string;
  cards: MarketingCardItem[];
  highlights?: string[];
  ctaTitle: string;
  ctaLead: string;
}) {
  return (
    <main className="pageMain marketingPage">
      <section className="card contentPageHeader">
        <p className="sectionEyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="contentPageLead">{lead}</p>
        {highlights && highlights.length > 0 ? (
          <div className="actionRow">
            {highlights.map((item) => (
              <span className="pill" key={item}>
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card marketingSection">
        <div className="marketingFeatureGrid">
          {cards.map((card) => (
            <Link href={card.href} className="marketingFeatureCard blogCardLink" key={card.href}>
              {card.tag ? <span className="badge">{card.tag}</span> : null}
              <h2 style={{ marginTop: card.tag ? 8 : 0 }}>{card.title}</h2>
              <p className="muted">{card.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>{ctaTitle}</h2>
          <p className="muted">{ctaLead}</p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            무료로 분석 시작
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            샘플 CSV 다운로드
          </a>
        </div>
      </section>
    </main>
  );
}

export function MarketingArticlePage({
  eyebrow,
  title,
  lead,
  sections,
  faq,
  relatedLinks
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sections: MarketingSection[];
  faq?: MarketingFaqItem[];
  relatedLinks?: MarketingCardItem[];
}) {
  return (
    <main className="pageMain marketingPage">
      <section className="card contentPageHeader">
        <p className="sectionEyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="contentPageLead">{lead}</p>
      </section>

      <article className="card blogPostBody">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.ordered ? (
              <ol>
                {section.ordered.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </article>

      {faq && faq.length > 0 ? (
        <section className="card marketingSection">
          <div className="marketingSectionIntro">
            <p className="sectionEyebrow">FAQ</p>
            <h2>자주 묻는 질문</h2>
          </div>
          <div className="grid">
            {faq.map((item) => (
              <div className="card" key={item.question}>
                <h3>{item.question}</h3>
                <p className="muted">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {relatedLinks && relatedLinks.length > 0 ? (
        <section className="card marketingSection">
          <div className="marketingSectionIntro">
            <p className="sectionEyebrow">Related</p>
            <h2>함께 보면 좋은 페이지</h2>
          </div>
          <div className="marketingFeatureGrid">
            {relatedLinks.map((card) => (
              <Link href={card.href} className="marketingFeatureCard blogCardLink" key={card.href}>
                {card.tag ? <span className="badge">{card.tag}</span> : null}
                <h3 style={{ marginTop: card.tag ? 8 : 0 }}>{card.title}</h3>
                <p className="muted">{card.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>리뷰 운영 흐름을 바로 검증해보세요.</h2>
          <p className="muted">CSV 업로드부터 인사이트 확인까지 한 번에 이어집니다.</p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            무료로 분석 시작
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            샘플 CSV 다운로드
          </a>
        </div>
      </section>
    </main>
  );
}
