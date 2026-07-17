import { escapeHtml, renderEmailLayout, renderPrimaryButton } from "./layout";

export function buildVerificationEmail(input: { verificationUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Bestätigen Sie Ihr SynSight Konto";
  const text = [
    "Willkommen bei SynSight.",
    "",
    "Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.",
    "",
    input.verificationUrl,
    "",
    "Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.",
    "Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail.",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(112,231,255,.65);">Kontoaktivierung</p>
    <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.25;font-weight:600;color:#ffffff;letter-spacing:-.02em;">Willkommen bei SynSight.</h1>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:rgba(232,237,245,.72);">
      Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.
    </p>
    ${renderPrimaryButton(input.verificationUrl, "E-Mail-Adresse bestätigen")}
    <p style="margin:22px 0 0 0;font-size:12px;line-height:1.6;color:rgba(232,237,245,.4);">
      Der Link ist 24 Stunden gültig und nur einmal verwendbar.<br />
      Falls der Button nicht funktioniert:<br />
      <span style="word-break:break-all;color:rgba(112,231,255,.7);">${escapeHtml(input.verificationUrl)}</span>
    </p>
  `;

  const { html } = renderEmailLayout({
    preheader: "Bestätigen Sie Ihre E-Mail-Adresse für SynSight.",
    title: subject,
    bodyHtml,
  });

  return { subject, text, html };
}
