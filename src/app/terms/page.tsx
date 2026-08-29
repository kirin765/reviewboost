import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/terms");

export const metadata: Metadata = generatePageMetadata(record);

export default function TermsPage() {
  return (
    <main className="pageMain">
      <StructuredData data={createWebPageStructuredData(record)} />
      <div className="card">
        <h1>Terms of Service</h1>
        <p className="muted">
          <strong>Effective Date:</strong> 2025-02-12
          <br />
          <strong>Company Name:</strong> Onnuri stationery
          <br />
          <strong>Website:</strong>{" "}
          <a className="link" href="https://reviewboost.co.kr" target="_blank" rel="noreferrer">
            https://reviewboost.co.kr
          </a>
        </p>

        <article className="legalDoc">
          <section className="legalSection">
            <h3>1. Overview</h3>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of our website and SaaS platform (the
              &quot;Service&quot;), which provides AI-powered customer review analysis, reporting, and content generation tools.
            </p>
            <p>By accessing or using the Service, you agree to be bound by these Terms.</p>
            <p>If you do not agree, you must not use the Service.</p>
          </section>

          <section className="legalSection">
            <h3>2. Description of Service</h3>
            <p>We provide a subscription-based software platform that allows users to:</p>
            <ul>
              <li>Upload CSV files containing customer reviews</li>
              <li>Analyze sentiment and keyword trends</li>
              <li>Generate categorized issue insights</li>
              <li>Receive AI-generated improvement suggestions</li>
              <li>Download summary reports in PDF format</li>
            </ul>
            <p>We do not sell physical goods.</p>
            <p>We do not provide financial, legal, or professional advisory services.</p>
          </section>

          <section className="legalSection">
            <h3>3. Eligibility</h3>
            <p>You must be at least 18 years old and legally capable of entering into binding agreements to use the Service.</p>
          </section>

          <section className="legalSection">
            <h3>4. Accounts</h3>
            <p>You are responsible for:</p>
            <ul>
              <li>Maintaining account confidentiality</li>
              <li>All activity under your account</li>
              <li>Providing accurate and current information</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </section>

          <section className="legalSection">
            <h3>5. Subscription and Payments</h3>
            <p>Access to certain features requires a paid subscription.</p>
            <ul>
              <li>Subscriptions may be billed monthly or annually.</li>
              <li>Fees are charged in advance.</li>
              <li>Payments are processed through third-party payment providers.</li>
              <li>You authorize recurring billing unless you cancel.</li>
            </ul>
            <p>We reserve the right to change pricing with prior notice.</p>
          </section>

          <section className="legalSection">
            <h3>6. Refund Policy</h3>
            <p>Unless otherwise required by law:</p>
            <ul>
              <li>Subscription fees are non-refundable.</li>
              <li>You may cancel at any time.</li>
              <li>Access remains active until the end of the billing period.</li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>7. User Content</h3>
            <p>You retain ownership of the data you upload.</p>
            <p>
              By using the Service, you grant us a limited license to process and analyze your uploaded content solely to provide
              the Service.
            </p>
            <p>You are responsible for ensuring that:</p>
            <ul>
              <li>You have the legal right to upload the content</li>
              <li>The content does not violate laws or third-party rights</li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>8. Prohibited Use</h3>
            <p>You may not:</p>
            <ul>
              <li>Upload illegal or harmful content</li>
              <li>Attempt to reverse-engineer the platform</li>
              <li>Abuse system resources</li>
              <li>Use the Service for unlawful purposes</li>
            </ul>
            <p>We may suspend or terminate access for violations.</p>
          </section>

          <section className="legalSection">
            <h3>9. Intellectual Property</h3>
            <p>All software, branding, algorithms, and materials related to the Service are owned by Onnuri stationery.</p>
            <p>You may not copy, distribute, or create derivative works without permission.</p>
          </section>

          <section className="legalSection">
            <h3>10. AI-Generated Output Disclaimer</h3>
            <p>The Service uses automated AI systems to generate analysis and suggestions.</p>
            <p>We do not guarantee:</p>
            <ul>
              <li>Accuracy</li>
              <li>Completeness</li>
              <li>Fitness for a particular purpose</li>
            </ul>
            <p>Users are responsible for reviewing and validating outputs before business use.</p>
          </section>

          <section className="legalSection">
            <h3>11. Limitation of Liability</h3>
            <p>To the maximum extent permitted by law:</p>
            <p>We shall not be liable for:</p>
            <ul>
              <li>Indirect or consequential damages</li>
              <li>Loss of profits or business opportunities</li>
              <li>Data loss</li>
            </ul>
            <p>Our total liability shall not exceed the amount paid by you in the preceding 12 months.</p>
          </section>

          <section className="legalSection">
            <h3>12. Termination</h3>
            <p>We may suspend or terminate your access if:</p>
            <ul>
              <li>You violate these Terms</li>
              <li>Required by law</li>
              <li>We discontinue the Service</li>
            </ul>
            <p>You may cancel your subscription at any time.</p>
          </section>

          <section className="legalSection">
            <h3>13. Privacy</h3>
            <p>
              Your use of the Service is also governed by our Privacy Policy:{" "}
              <a className="link" href="https://reviewboost.co.kr/privacy" target="_blank" rel="noreferrer">
                https://reviewboost.co.kr/privacy
              </a>
            </p>
          </section>

          <section className="legalSection">
            <h3>14. Governing Law</h3>
            <p>These Terms are governed by the laws of the Republic of Korea.</p>
            <p>Any disputes shall be resolved in the competent courts of Korea.</p>
          </section>

          <section className="legalSection">
            <h3>15. Changes to Terms</h3>
            <p>We may update these Terms from time to time.</p>
            <p>Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
          </section>

          <section className="legalSection">
            <h3>16. Business &amp; Contact Information (사업자 정보)</h3>
            <p>
              Business Name (상호): Onnuri stationery (온누리문방구)
              <br />
              Representative (대표자): Kim Ki-wan (김기완)
              <br />
              Business Registration Number (사업자등록번호): 892-02-03657
              <br />
              Mail-Order Sales Registration (통신판매업신고): 제2025-경기광명-0525호
              <br />
              Address (주소): 12, Ilsan-ro 463beon-gil, Ilsandong-gu, Goyang-si, Gyeonggi-do, Republic of Korea (경기도 고양시 일산동구 일산로463번길 12, 204동 103호)
              <br />
              Phone (전화): 010-8555-8219
              <br />
              Email:{" "}
              <a className="link" href="mailto:kwan765@naver.com">
                kwan765@naver.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
