"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  lead: string;
  bullets: string[];
  note?: string;
  children: ReactNode;
  asideFooter?: ReactNode;
}

export default function AuthShell({ eyebrow, title, lead, bullets, note, children, asideFooter }: AuthShellProps) {
  const { locale } = useTranslation();
  const visualMain = locale === "en" ? "Upload CSV, map columns, and share results in one workflow." : "CSV 업로드, 매핑, 결과 공유를 한 흐름으로 정리합니다.";
  const visualSide = locale === "en" ? "Recent negative review response speed improved" : "최근 부정 리뷰 대응 속도 개선";

  return (
    <main className="pageMain authPage">
      <div className="authShell">
        <section className="authAside" aria-label="Service intro">
          <a className="authBrand" href="/">
            <span className="authBrandMark" aria-hidden="true">
              <span className="authBrandMarkDot" />
              <span className="authBrandMarkLine authBrandMarkLineOne" />
              <span className="authBrandMarkLine authBrandMarkLineTwo" />
            </span>
            <span className="authBrandText">
              <strong>ReviewBoost</strong>
              <small>AI review ops dashboard</small>
            </span>
          </a>

          <p className="authEyebrow">{eyebrow}</p>
          <h1 className="authTitle">{title}</h1>
          <p className="authLead">{lead}</p>

          <div className="authVisual" aria-hidden="true">
            <div className="authVisualOrb authVisualOrbPrimary" />
            <div className="authVisualOrb authVisualOrbWarm" />
            <div className="authVisualCard authVisualCardMain">
              <span className="authVisualCardLabel">Workspace</span>
              <strong>Review analysis</strong>
              <span>{visualMain}</span>
            </div>
            <div className="authVisualCard authVisualCardSide">
              <span className="authVisualMiniLabel">Weekly signal</span>
              <strong>+24%</strong>
              <span>{visualSide}</span>
            </div>
          </div>

          <div className="authBulletList">
            {bullets.map((bullet) => (
              <div className="authBullet" key={bullet}>
                <span className="authBulletDot" aria-hidden="true" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          {note ? <div className="authNote">{note}</div> : null}
          {asideFooter ? <div className="authAsideFooter">{asideFooter}</div> : null}
        </section>

        <section className="authPanel">{children}</section>
      </div>
    </main>
  );
}
