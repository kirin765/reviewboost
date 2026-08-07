import type { Metadata } from "next";
import SupportForm from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "1:1 문의 | ReviewBoost",
  description: "결제·환불, 사용 방법, 오류 신고 등 무엇이든 남겨주세요. 이메일로 답변드립니다."
};

export default function SupportPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h1>1:1 문의</h1>
        <p className="muted">
          결제·환불, 사용 방법, 오류 신고 등 무엇이든 남겨주세요. 접수 즉시 확인하고 이메일로 답변드립니다.
          <br />
          이메일이 편하시면 <a className="link" href="mailto:kwan765@naver.com">kwan765@naver.com</a> 으로 직접 보내셔도 됩니다.
        </p>
      </div>
      <SupportForm />
    </main>
  );
}
