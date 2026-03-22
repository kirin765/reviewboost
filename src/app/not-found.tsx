import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - 페이지를 찾을 수 없습니다",
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <main className="pageMain" style={{ textAlign: "center", paddingTop: "80px" }}>
      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>404</h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          요청하신 페이지를 찾을 수 없습니다.
        </p>
        <div className="actionRow" style={{ justifyContent: "center" }}>
          <a className="btn btnPrimary" href="/">홈으로 돌아가기</a>
          <a className="btn" href="/help">사용법 보기</a>
        </div>
      </div>
    </main>
  );
}
