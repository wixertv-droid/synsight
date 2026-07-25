import { escapeHtml, renderEmailLayout, renderPrimaryButton } from "./layout";

export function buildPasswordResetEmail(input: { resetUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Passwort zurücksetzen — SynSight";
  const text = [
    "Passwort zurücksetzen",
    "",
    "Sie haben eine Zurücksetzung Ihres SynSight-Passworts angefordert.",
    "Öffnen Sie den folgenden Link, um ein neues Passwort festzulegen:",
    "",
    input.resetUrl,
    "",
    "Der Link ist 1 Stunde gültig und kann nur einmal verwendet werden.",
    "Falls Sie keine Zurücksetzung angefordert haben, ignorieren Sie diese E-Mail.",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(112,231,255,.65);">Passwort zurücksetzen</p>
    <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.25;font-weight:600;color:#ffffff;letter-spacing:-.02em;">Neues Passwort festlegen</h1>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:rgba(232,237,245,.72);">
      Sie haben eine Zurücksetzung Ihres SynSight-Passworts angefordert. Klicken Sie auf den Button, um ein neues Passwort zu wählen.
    </p>
    ${renderPrimaryButton(input.resetUrl, "Passwort zurücksetzen")}
    <p style="margin:22px 0 0 0;font-size:12px;line-height:1.6;color:rgba(232,237,245,.4);">
      Der Link ist 1 Stunde gültig und nur einmal verwendbar.<br />
      Falls der Button nicht funktioniert:<br />
      <span style="word-break:break-all;color:rgba(112,231,255,.7);">${escapeHtml(input.resetUrl)}</span>
    </p>
  `;

  const { html } = renderEmailLayout({
    preheader: "Setzen Sie Ihr SynSight-Passwort zurück.",
    title: subject,
    bodyHtml,
  });

  return { subject, text, html };
}
