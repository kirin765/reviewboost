/**
 * 1:1 문의 텔레그램 알림. best-effort — 미구성/실패 시 false.
 * parse_mode 를 쓰지 않는다: 문의 본문이 임의 텍스트라 마크다운 파싱 오류로 전송이 실패할 수 있다.
 */
export async function notifySupportInquiry(input: {
  userId: string | null;
  email: string;
  category: string;
  message: string;
}): Promise<boolean> {
  const token = process.env.SUPPORT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.SUPPORT_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const text = [
    "📩 ReviewBoost 1:1 문의",
    `유형: ${input.category}`,
    `이메일: ${input.email}`,
    `사용자: ${input.userId ?? "비로그인"}`,
    "",
    input.message
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    return res.ok;
  } catch {
    return false;
  }
}
