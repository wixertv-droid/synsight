import { escapeHtml, renderEmailLayout } from "./layout";

export function buildPressEmail(input: {
  name: string;
  email: string;
  medium: string;
  topic: string;
  message?: string | null;
  requestId: number;
}): { subject: string; text: string; html: string } {
  const subject = `[SynSight Presse] ${input.topic}`;
  const text = [
    "Neue Presseanfrage",
    "",
    `Name: ${input.name}`,
    `Medium: ${input.medium}`,
    `E-Mail: ${input.email}`,
    `Thema: ${input.topic}`,
    `Anfrage-ID: ${input.requestId}`,
    "",
    input.message ? `Nachricht:\n${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(112,231,255,.65);">Presse</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#fff;">Neue Presseanfrage</h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:rgba(232,237,245,.72);">
      <tr><td style="padding:6px 0;width:120px;color:rgba(232,237,245,.4);">Name</td><td>${escapeHtml(input.name)}</td></tr>
      <tr><td style="padding:6px 0;color:rgba(232,237,245,.4);">Medium</td><td>${escapeHtml(input.medium)}</td></tr>
      <tr><td style="padding:6px 0;color:rgba(232,237,245,.4);">E-Mail</td><td>${escapeHtml(input.email)}</td></tr>
      <tr><td style="padding:6px 0;color:rgba(232,237,245,.4);">Thema</td><td>${escapeHtml(input.topic)}</td></tr>
      <tr><td style="padding:6px 0;color:rgba(232,237,245,.4);">ID</td><td>#${input.requestId}</td></tr>
    </table>
    ${
      input.message
        ? `<p style="margin:18px 0 8px 0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,237,245,.4);">Nachricht</p>
           <div style="padding:14px 16px;border-radius:12px;border:1px solid rgba(139,217,255,.12);background:rgba(255,255,255,.03);font-size:14px;line-height:1.6;color:rgba(232,237,245,.75);">${escapeHtml(input.message).replaceAll("\n", "<br/>")}</div>`
        : ""
    }
  `;

  const { html } = renderEmailLayout({
    preheader: `Presseanfrage von ${input.name} (${input.medium})`,
    title: subject,
    bodyHtml,
  });

  return { subject, text, html };
}
