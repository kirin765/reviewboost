import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/extension-privacy");

export const metadata: Metadata = generatePageMetadata(record);

export default function ExtensionPrivacyPage() {
  return (
    <main className="pageMain">
      <StructuredData data={createWebPageStructuredData(record)} />
      <div className="card">
        <h1>Privacy Policy — ReviewBoost Review Collector Extension</h1>
        <p className="muted">
          <strong>Effective Date:</strong> 2026-07-10
          <br />
          <strong>Company Name:</strong> Onnuri stationery
          <br />
          <strong>Extension:</strong> ReviewBoost 리뷰 수집기 — 쿠팡·스마트스토어 리뷰 엑셀 내보내기
          <br />
          <strong>Website:</strong>{" "}
          <a className="link" href="https://reviewboost.co.kr" target="_blank" rel="noreferrer">
            https://reviewboost.co.kr
          </a>
        </p>

        <article className="legalDoc">
          <section className="legalSection">
            <h3>1. Introduction</h3>
            <p>
              This Privacy Policy explains what data the ReviewBoost Review Collector Chrome extension (the
              &quot;Extension&quot;) accesses, how it is used, and how it is shared. It supplements the main{" "}
              <a className="link" href="https://reviewboost.co.kr/privacy" target="_blank" rel="noreferrer">
                ReviewBoost Privacy Policy
              </a>
              , which governs the reviewboost.co.kr website and SaaS platform.
            </p>
          </section>

          <section className="legalSection">
            <h3>2. What the Extension Does</h3>
            <p>
              The Extension reads publicly visible product review content from the Coupang and Naver Smart
              Store/Brand Store product pages you are currently viewing, so you can export that review data as
              CSV/Excel or send it to ReviewBoost for analysis.
            </p>
          </section>

          <section className="legalSection">
            <h3>3. Permissions and Why We Need Them</h3>
            <ul>
              <li>
                <strong>activeTab / host permissions</strong> (coupang.com, smartstore.naver.com, brand.naver.com) —
                lets the Extension read review content on the product page you are actively viewing. The Extension
                does not run on, or read data from, any other site.
              </li>
              <li>
                <strong>storage</strong> — used to temporarily save collected review data locally in your browser
                before export.
              </li>
              <li>
                <strong>externally_connectable</strong> (reviewboost.co.kr) — allows the Extension to hand off
                collected review data directly to the ReviewBoost web app when you choose to analyze it, without
                a manual file upload step.
              </li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>4. Information We Do Not Collect</h3>
            <p>The Extension does not collect, and has no access to:</p>
            <ul>
              <li>Your name, email address, or account credentials</li>
              <li>Payment or financial information</li>
              <li>Browsing history outside the product pages listed above</li>
              <li>Keystrokes, passwords, or form data unrelated to review content</li>
            </ul>
            <p>We do not sell or share collected data with third parties for advertising purposes.</p>
          </section>

          <section className="legalSection">
            <h3>5. Data Storage and Transfer</h3>
            <p>
              Review data collected by the Extension stays in your local browser storage until you export it or
              send it to ReviewBoost. If you choose to send data to ReviewBoost for analysis, it is transmitted
              securely (HTTPS) and handled under the{" "}
              <a className="link" href="https://reviewboost.co.kr/privacy" target="_blank" rel="noreferrer">
                ReviewBoost Privacy Policy
              </a>
              .
            </p>
          </section>

          <section className="legalSection">
            <h3>6. Your Choices</h3>
            <p>
              You can remove locally stored data at any time by uninstalling the Extension or clearing its storage
              via Chrome&apos;s extension settings.
            </p>
          </section>

          <section className="legalSection">
            <h3>7. Changes to This Policy</h3>
            <p>We may update this Privacy Policy as the Extension changes. Continued use of the Extension after changes constitutes acceptance of the revised policy.</p>
          </section>

          <section className="legalSection">
            <h3>8. Contact</h3>
            <p>
              Company Name: Onnuri stationery
              <br />
              Email:{" "}
              <a className="link" href="mailto:kwan765@naver.com">
                kwan765@naver.com
              </a>
              <br />
              Address: 56, Soha-ro, Gwangmyeong-si, Gyeonggi-do, Republic of Korea
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
