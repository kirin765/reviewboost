import { getServerTranslation } from "@/lib/i18n/server";

export default async function HelpChecklistPage() {
  const { t } = await getServerTranslation();

  return (
    <main className="pageMain">
      <div className="card">
        <h2>{t("checklist.title")}</h2>
        <p className="muted">{t("checklist.lead")}</p>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            {t("checklist.analyzeNow")}
          </a>
          <a className="btn" href="/sample.csv" download>
            {t("checklist.sampleFull")}
          </a>
          <a className="btn" href="/sample_simple.csv" download>
            {t("checklist.sampleSimple")}
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{t("checklist.prepTitle")}</h2>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.prep1") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.prep2") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.prep3") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.prep4") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.prep5") }} />
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>{t("checklist.exportTitle")}</h2>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.export1") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.export2") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.export3") }} />
            </li>
          </ul>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{t("checklist.afterUploadTitle")}</h2>
          <p className="muted">{t("checklist.afterUploadLead")}</p>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.after1") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.after2") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.after3") }} />
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>{t("checklist.shareTitle")}</h2>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.share1") }} />
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText" dangerouslySetInnerHTML={{ __html: t("checklist.share2") }} />
            </li>
          </ul>
          <details className="details detailsSpacing">
            <summary className="detailsSummary">{t("checklist.troubleSummary")}</summary>
            <div className="muted detailsText">
              <div>{t("checklist.trouble1")}</div>
              <div>{t("checklist.trouble2")}</div>
              <div>{t("checklist.trouble3")}</div>
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}
