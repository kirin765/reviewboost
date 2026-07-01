export function deriveNickname(u: { firstName?: string | null; email?: string | null }): string {
  const name = u.firstName?.trim();
  if (name) return name;
  const local = u.email?.split("@")[0]?.trim();
  if (local) return local;
  return "사장님";
}

export function buildOutreachEmail(nickname: string): { subject: string; text: string } {
  const subject = `${nickname}님, 리뷰부스트 초기 사용자분께 직접 여쭤보고 싶어요`;
  const text = `안녕하세요 ${nickname}님,

리뷰부스트(reviewboost.co.kr)를 만든 기완입니다. 초기에 가입해주신 분이라 자동 메일 말고 직접 인사드리고 싶었어요. 정말 감사합니다 🙏

저도 1년 정도 스마트스토어·쿠팡으로 직접 팔아봤는데, 쌓이는 리뷰 관리하고 부정 리뷰에 일일이 대응하는 게 제일 골치였어요. 그 스트레스 때문에 리뷰부스트를 만들기 시작했고요.

뭐 팔려는 거 아니에요(약속!). 딱 하나, ${nickname}님이 평소 상품 리뷰·CS를 어떻게 관리해 오셨는지가 너무 궁금해요. 리뷰부스트가 진짜 쓸모 있으려면 실제 셀러분 얘기를 들어야 하더라고요.

혹시 15분 통화 가능하실까요? 시간 내주시면 커피 기프티콘 보내드릴게요 ☕
· 편하신 시간 알려주시면 맞출게요 (예: 이번 주 화·수 저녁 / 목 오전)

통화가 부담되시면, 답장으로 이 두 가지만 알려주셔도 큰 도움이 돼요:

1. 리뷰부스트 가입 전엔 리뷰·CS를 어떻게 관리하고 계셨나요? (엑셀 / 수기 / 안 함?)
2. 지금 가장 불편한 점 딱 하나는요?

감사합니다. 답장 기다릴게요!
기완 드림 — 리뷰부스트 만든 사람
(카톡: sajangbu / 연락처: 010-8555-8219)`;
  return { subject, text };
}
