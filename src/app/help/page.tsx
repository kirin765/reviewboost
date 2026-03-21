import type { Metadata } from "next";
import { getServerTranslation } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "사용법 - ReviewBoost CSV 업로드 & 리뷰 분석 가이드",
  description: "ReviewBoost 사용법을 단계별로 안내합니다. CSV 준비, 열 매핑, AI 분석, PDF 리포트 다운로드까지 2분이면 시작할 수 있습니다.",
  alternates: { canonical: "/help" }
};

export default async function HelpPage() {
  const { t } = await getServerTranslation();

  return (
    <main className="pageMain pageTop">
      <div className="card">
        <h2>{t("help.pageTitle")}</h2>
        <p className="muted">{t("help.pageLead")}</p>
      </div>

      {/* 4-Step Guide */}
      <div className="helpStepGrid">
        <div className="step completed">
          <span className="stepNumber">1</span>
          <span>{t("help.step1")}</span>
        </div>
        <div className="step">
          <span className="stepNumber">2</span>
          <span>{t("help.step2")}</span>
        </div>
        <div className="step">
          <span className="stepNumber">3</span>
          <span>{t("help.step3")}</span>
        </div>
        <div className="step">
          <span className="stepNumber">4</span>
          <span>{t("help.step4")}</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{t("help.csvPrepTitle")}</h2>
          <div className="list">
            <div className="row">
              <div className="left">{t("help.csvRequired")}</div>
              <div className="right">{t("help.csvRequiredValue")}</div>
            </div>
            <div className="row">
              <div className="left">{t("help.csvRecommended")}</div>
              <div className="right">{t("help.csvRecommendedValue")}</div>
            </div>
            <div className="row">
              <div className="left">{t("help.csvOptional")}</div>
              <div className="right">{t("help.csvOptionalValue")}</div>
            </div>
          </div>
          <p className="hint muted sectionSpacing" dangerouslySetInnerHTML={{ __html: t("help.csvSaveHint") }} />
          <div className="actionRow">
            <a className="btn" href="/sample.csv" download>
              {t("help.sampleCsvFull")}
            </a>
            <a className="btn" href="/sample_simple.csv" download>
              {t("help.sampleCsvSimple")}
            </a>
          </div>
        </div>

        <div className="card">
          <h2>{t("help.uploadTitle")}</h2>
          <p className="muted">{t("help.uploadLead")}</p>
          <p className="hint muted">{t("help.uploadHint")}</p>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{t("help.resultsTitle")}</h2>
          <p className="muted">{t("help.resultsLead")}</p>
          <ul className="muted mutedList">
            <li>{t("help.resultItem1")}</li>
            <li>{t("help.resultItem2")}</li>
            <li>{t("help.resultItem3")}</li>
            <li>{t("help.resultItem4")}</li>
            <li>{t("help.resultItem5")}</li>
            <li>{t("help.resultItem6")}</li>
            <li>{t("help.resultItem7")}</li>
          </ul>
          <p className="hint muted sectionSpacing">{t("help.resultsHint")}</p>
          <div className="actionRow">
            <a className="btn btnPrimary" href="/dashboard">
              {t("help.analyzeNow")}
            </a>
          </div>
        </div>

        <div className="card">
          <h2>{t("help.saveTitle")}</h2>
          <p className="muted">{t("help.saveLead")}</p>
          <p className="hint muted">{t("help.saveHint")}</p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card sectionSpacing">
        <h2>{t("help.faqTitle")}</h2>
        <div className="list">
          <div className="row rowColumn">
            <div className="textBold textSmall">{t("help.faq1Q")}</div>
            <div className="muted textSmall">{t("help.faq1A")}</div>
          </div>
          <div className="row rowColumn">
            <div className="textBold textSmall">{t("help.faq2Q")}</div>
            <div className="muted textSmall">{t("help.faq2A")}</div>
          </div>
          <div className="row rowColumn">
            <div className="textBold textSmall">{t("help.faq3Q")}</div>
            <div className="muted textSmall">{t("help.faq3A")}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
