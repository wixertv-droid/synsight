/** Shared HTML helpers for SynSight transactional emails. */

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderEmailLayout(input: {
  preheader: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
}): { html: string; textFallbackHint: string } {
  const year = new Date().getFullYear();
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#03050a;color:#e8edf5;font-family:Manrope,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#03050a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:linear-gradient(145deg,rgba(18,27,43,.96),rgba(7,11,19,.98));border:1px solid rgba(139,217,255,.16);border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:36px;height:36px;border-radius:999px;border:1px solid rgba(41,182,246,.45);text-align:center;line-height:36px;color:#70e7ff;font-size:14px;font-weight:700;">◈</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <div style="font-size:15px;letter-spacing:.22em;font-weight:700;color:#ffffff;">SYN<span style="color:#29b6f6;">SIGHT</span></div>
                    <div style="font-size:10px;letter-spacing:.16em;color:rgba(153,213,237,.55);text-transform:uppercase;margin-top:4px;">Identity Intelligence</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;">
              <div style="height:1px;background:linear-gradient(90deg,rgba(41,182,246,.05),rgba(112,231,255,.55),rgba(41,182,246,.05));"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <div style="font-size:11px;line-height:1.6;color:rgba(232,237,245,.35);">
                ${escapeHtml(input.footerNote ?? "SynSight — Digitale Identitätssicherheit. Diese Nachricht wurde automatisch erzeugt.")}
                <br />© ${year} SynSight · synsight.de
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, textFallbackHint: input.title };
}

export function renderPrimaryButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:8px;padding:14px 22px;border-radius:12px;background:rgba(112,231,255,.14);border:1px solid rgba(112,231,255,.4);color:#70e7ff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.04em;">${escapeHtml(label)}</a>`;
}
