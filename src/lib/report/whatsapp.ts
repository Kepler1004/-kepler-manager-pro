// src/lib/report/whatsapp.ts
// WhatsApp Cloud API 발송 유틸. 환경변수: WA_TOKEN, WA_PHONE_NUMBER_ID
const BASE = 'https://graph.facebook.com/v22.0';

function cfg() {
  const token = process.env.WA_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error('WA_TOKEN / WA_PHONE_NUMBER_ID 미설정');
  return { token, phoneId };
}

// 승인된 템플릿 메시지 발송 (먼저 말 거는 알림용)
export async function sendTemplate(to: string, template: string, lang = 'en_US') {
  const { token, phoneId } = cfg();
  const res = await fetch(`${BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: template, language: { code: lang } },
    }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// 일반 텍스트 발송 (사용자가 최근 24시간 내 응답했을 때만 허용)
export async function sendText(to: string, body: string) {
  const { token, phoneId } = cfg();
  const res = await fetch(`${BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
