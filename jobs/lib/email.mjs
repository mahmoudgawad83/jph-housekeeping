// Transactional e-mail via Brevo (default) or Resend.
const { EMAIL_PROVIDER = 'brevo', EMAIL_API_KEY, EMAIL_FROM } = process.env;
export const emailEnabled = Boolean(EMAIL_API_KEY && EMAIL_FROM);

/**
 * @param {{to: {email:string,name?:string}[], subject:string, html:string, senderName:string,
 *          attachments?: {filename:string, content:Buffer}[]}} msg
 */
export async function sendEmail({ to, subject, html, senderName, attachments = [] }) {
  if (!emailEnabled) throw new Error('E-mail is not configured (EMAIL_API_KEY / EMAIL_FROM missing)');
  if (!to.length) return;
  let r;
  if (EMAIL_PROVIDER === 'resend') {
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${senderName} <${EMAIL_FROM}>`, to: to.map((x) => x.email), subject, html,
        attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })),
      }),
    });
  } else {
    r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': EMAIL_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName, email: EMAIL_FROM },
        to: to.map((x) => (x.name ? { email: x.email, name: x.name } : { email: x.email })),
        subject, htmlContent: html,
        ...(attachments.length ? { attachment: attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') })) } : {}),
      }),
    });
  }
  if (!r.ok) throw new Error(`E-mail provider error ${r.status}: ${await r.text()}`);
}
