import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 - ReviewBoost",
  description: "ReviewBoost 서비스 이용약관입니다. 서비스 이용 조건, 개인정보 처리, 환불 정책 등을 확인하세요.",
  alternates: { canonical: "/term" }
};

export default function TermPage() {
  return (
    <main className="pageMain">
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
              &quot;Service&quot;),
              which provides AI-powered customer review analysis, reporting, and content generation tools.
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
            <h3>16. Contact Information</h3>
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
