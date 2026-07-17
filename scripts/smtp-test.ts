/**
 * Ops helper: verify SMTP connectivity and optionally send a test message.
 *
 *   EMAIL_DELIVERY_MODE=provider \
 *   SMTP_HOST=mxf920.netcup.net SMTP_PORT=465 SMTP_SECURE=true \
 *   SMTP_USER=noreply@synsight.de SMTP_PASS='…' \
 *   SMTP_FROM='SynSight <noreply@synsight.de>' \
 *   npm run email:test -- you@example.com
 */
import { getEnvironment, resetEnvironmentCache } from "../src/lib/config/env";
import { sendSmtpMail, verifySmtpConnection } from "../src/lib/email/smtp";

async function main() {
  resetEnvironmentCache();
  const env = getEnvironment();
  const to = process.argv[2] || env.SMTP_USER;

  if (!to) {
    console.error("Usage: npm run email:test -- recipient@example.com");
    process.exit(1);
  }

  console.info("[email:test] verifying SMTP…");
  const verified = await verifySmtpConnection(env);
  if (!verified.ok) {
    console.error("[email:test] verify failed:", verified.error);
    process.exit(2);
  }
  console.info("[email:test] verify ok via", verified.via);

  const result = await sendSmtpMail(env, {
    from: env.SMTP_FROM as string,
    to,
    subject: "SynSight SMTP Test",
    text: "Dies ist eine SynSight SMTP-Testnachricht. Der Versand funktioniert.",
    html: "<p>Dies ist eine <strong>SynSight</strong> SMTP-Testnachricht. Der Versand funktioniert.</p>",
  });

  console.info("[email:test] sent", {
    to,
    messageId: result.messageId,
    via: result.via,
  });
}

main().catch((error) => {
  console.error(
    "[email:test] failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
