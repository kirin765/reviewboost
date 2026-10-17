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
          <strong>Effective Date:</strong> 2026-10-14
          <br />
          <strong>Company Name:</strong> Onnuri stationery
          <br />
          <strong>Extension:</strong> ReviewBoost 리뷰 수집기 (ReviewBoost Review Collector)
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
              This Privacy Policy explains what data the ReviewBoost Review Collector browser extension (the
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
              The Extension reads publicly visible product review content from Coupang, Naver Smart Store/Brand
              Store, Musinsa, 29CM, Gmarket, Auction, 11st, SSG, Ohouse, Kurly, Olive Young and Kakao Talk
              Store product pages, so you can export that review data as
              CSV/Excel or send it to ReviewBoost for analysis.
            </p>
          </section>

          <section className="legalSection">
            <h3>3. Permissions and Why We Need Them</h3>
            <ul>
              <li>
                <strong>activeTab / marketplace host permissions</strong> — let the Extension identify the active
                product page and read public reviews from the supported marketplaces and their review APIs when
                you request collection. ReviewBoost host access supports account connection, usage limits,
                optional analysis and support requests.
              </li>
              <li>
                <strong>storage</strong> — stores collected reviews, up to five recent collection records
                (including product URL, title and collection time), daily usage counts, and the account
                connection token and its expiration time locally in your browser.
              </li>
              <li>
                <strong>scripting</strong> — injects packaged scripts needed to collect reviews, including
                capturing Smart Store/Brand Store review API requests for the collection you initiate.
              </li>
              <li>
                <strong>page-to-extension messaging</strong> (reviewboost.co.kr) — allows the Extension to hand off
                collected review data directly to the ReviewBoost web app when you choose to analyze it, and
                receive an authentication token when you connect your account. Chrome uses <code>externally_connectable</code>; Firefox uses a
                content-script message bridge on reviewboost.co.kr.
              </li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>4. Information Handled by the Extension</h3>
            <ul>
              <li>Public review text, ratings, dates, displayed author identifiers, image URLs and product information used for export or optional analysis.</li>
              <li>An account connection token used to identify your ReviewBoost account and check collection limits. Your login password is not provided to the Extension.</li>
              <li>Collection counts and operational events, such as reaching the free limit, anonymous collection and usage-request errors. Connected-account events may be linked to your account.</li>
              <li>The email address, inquiry category and message you enter when you choose to send a support request.</li>
            </ul>
            <p>The Extension does not collect your general browsing history, unrelated keystrokes or payment-card details. Checkout is handled on the website by the payment provider.</p>
            <p>We do not sell user data or use it for personalized advertising. Our use and transfer of information received through the Extension complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.</p>
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
            <p>
              Exporting a file does not upload its review contents to ReviewBoost. Account-connected collection
              sends usage counts and uses the stored token to check your plan. Operational usage events can
              also be sent without account connection. These requests do not include review text. Network
              requests may produce routine server logs, including IP address and request time.
            </p>
            <p>
              Support requests send the email address, category and message you provide to our server for
              storage and to our support operator through a Telegram notification. Optional analysis uses
              ReviewBoost hosting, storage and AI service providers as described in the main privacy policy.
              Data is transferred over HTTPS and used to provide, maintain and support these features.
            </p>
          </section>

          <section className="legalSection">
            <h3>6. Your Choices</h3>
            <p>
              You can remove locally stored data at any time by uninstalling the Extension or clearing its storage
              via your browser&apos;s extension settings. You can also delete recent collection records in the
              Extension. Exported files remain on your device until you delete them. Analysis and support
              submissions are optional. Contact us below to request deletion of server-held account, usage or
              support data; records required for legal obligations may need to be retained.
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
              Address: 12, Ilsan-ro 463beon-gil, Ilsandong-gu, Goyang-si, Gyeonggi-do, Republic of Korea
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
