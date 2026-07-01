import nodemailer from "nodemailer";

export async function sendNaverEmail(opts: { to: string; subject: string; text: string }): Promise<void> {
  const user = process.env.NAVER_SMTP_USER;
  const pass = process.env.NAVER_SMTP_PASS;
  if (!user || !pass) throw new Error("NAVER_SMTP_USER/NAVER_SMTP_PASS not set");

  const from = process.env.NAVER_SMTP_FROM || `리뷰부스트 기완 <${user}>`;
  const transporter = nodemailer.createTransport({
    host: "smtp.naver.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text });
}
