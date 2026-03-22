import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 - ReviewBoost",
  description: "ReviewBoost 개인정보처리방침입니다. 수집하는 정보, 이용 목적, 보관 기간 등을 확인하세요.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h1>Privacy Policy</h1>
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
            <h3>1. Introduction</h3>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use our
              website and SaaS platform (the “Service”).
            </p>
            <p>By using the Service, you agree to this Privacy Policy.</p>
          </section>

          <section className="legalSection">
            <h3>2. Information We Collect</h3>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li>Name</li>
              <li>Email address</li>
              <li>Account credentials</li>
              <li>Billing information (processed via third-party payment providers)</li>
              <li>Uploaded review data (CSV files and related content)</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <ul>
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Usage logs</li>
              <li>Cookies and analytics data</li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>3. Uploaded Review Data</h3>
            <p>Our Service allows users to upload CSV files containing customer reviews.</p>
            <p>You retain ownership of uploaded content.</p>
            <p>We process uploaded data solely for:</p>
            <ul>
              <li>Sentiment analysis</li>
              <li>Keyword extraction</li>
              <li>Issue categorization</li>
              <li>AI-generated suggestions</li>
              <li>Report generation</li>
            </ul>
            <p>We do not sell uploaded data.</p>
            <p>We do not use uploaded content for marketing purposes.</p>
          </section>

          <section className="legalSection">
            <h3>4. AI Processing</h3>
            <p>The Service uses automated AI systems to analyze uploaded content and generate output.</p>
            <p>Uploaded data may be processed:</p>
            <ul>
              <li>On our secure servers</li>
              <li>Through trusted third-party AI infrastructure providers</li>
            </ul>
            <p>Data is processed only to provide the Service.</p>
            <p>We do not use your uploaded data to train public AI models.</p>
          </section>

          <section className="legalSection">
            <h3>5. How We Use Information</h3>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and maintain the Service</li>
              <li>Process payments and subscriptions</li>
              <li>Improve product performance</li>
              <li>Respond to customer inquiries</li>
              <li>Prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>6. Payment Processing</h3>
            <p>Payments are processed through third-party providers.</p>
            <p>We do not store full credit card numbers.</p>
            <p>Payment providers may collect and process data under their own privacy policies.</p>
          </section>

          <section className="legalSection">
            <h3>7. Data Retention</h3>
            <p>We retain:</p>
            <ul>
              <li>Account data while your account is active</li>
              <li>Uploaded data until deleted by you or upon account termination</li>
              <li>Billing records as required by law</li>
            </ul>
            <p>You may request deletion of your data at any time.</p>
          </section>

          <section className="legalSection">
            <h3>8. Data Security</h3>
            <p>We implement reasonable technical and organizational safeguards to protect data, including:</p>
            <ul>
              <li>Encrypted transmission (HTTPS)</li>
              <li>Access controls</li>
              <li>Secure hosting infrastructure</li>
            </ul>
            <p>However, no system can guarantee absolute security.</p>
          </section>

          <section className="legalSection">
            <h3>9. Data Sharing</h3>
            <p>We may share information with:</p>
            <ul>
              <li>Payment processors</li>
              <li>Hosting providers</li>
              <li>AI infrastructure providers</li>
              <li>Analytics providers</li>
            </ul>
            <p>We do not sell personal data.</p>
            <p>We do not share data for advertising purposes.</p>
          </section>

          <section className="legalSection">
            <h3>10. International Data Transfers</h3>
            <p>Your data may be processed in countries outside your residence.</p>
            <p>We ensure appropriate safeguards are in place where required.</p>
          </section>

          <section className="legalSection">
            <h3>11. Your Rights</h3>
            <p>Depending on your jurisdiction, you may have rights to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion</li>
              <li>Object to processing</li>
              <li>Withdraw consent</li>
            </ul>
            <p>
              Requests can be sent to:{" "}
              <a className="link" href="mailto:kwan765@naver.com">
                kwan765@naver.com
              </a>
            </p>
          </section>

          <section className="legalSection">
            <h3>12. Cookies</h3>
            <p>We use cookies for:</p>
            <ul>
              <li>Authentication</li>
              <li>Analytics</li>
              <li>Service performance</li>
            </ul>
            <p>You can control cookies via browser settings.</p>
          </section>

          <section className="legalSection">
            <h3>13. Children’s Privacy</h3>
            <p>The Service is not intended for individuals under 18.</p>
            <p>We do not knowingly collect data from children.</p>
          </section>

          <section className="legalSection">
            <h3>14. Changes to This Policy</h3>
            <p>We may update this Privacy Policy.</p>
            <p>Continued use of the Service constitutes acceptance of changes.</p>
          </section>

          <section className="legalSection">
            <h3>15. Contact</h3>
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
