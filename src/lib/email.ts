import { Resend } from 'resend';

export function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendPdfEmail(opts: {
  to: string; subject: string; html: string;
  filename: string; pdf: Buffer;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: [{ filename: opts.filename, content: opts.pdf }],
  });
}
