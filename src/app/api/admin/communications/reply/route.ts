import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/response";
import { getStaffAccess } from "@/lib/admin/access";
import { validateMutationOrigin } from "@/lib/security/request";
import { getCommunicationsRepository } from "@/lib/repositories";
import type { CommunicationChannel } from "@/lib/repositories/communications-repository";

import {
  resolveMailAccountRuntime,
  type MailAccountKey,
} from "@/lib/services/mail-settings-service";

import { sanitizeSmtpError, sendSmtpMail } from "@/lib/email/smtp";

import { recordCommunicationHistory } from "@/lib/services/communication-history-service";

const schema = z.object({
  channel: z.enum(["contact", "partner", "press", "support"]),

  id: z.number().int().positive(),

  subject: z
    .string()
    .trim()
    .min(1, "Bitte einen Betreff eingeben.")
    .max(200, "Der Betreff ist zu lang."),

  message: z
    .string()
    .trim()
    .min(1, "Bitte eine Antwort schreiben.")
    .max(10000, "Die Antwort ist zu lang."),
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function findRequest(channel: CommunicationChannel, id: number) {
  const repo = getCommunicationsRepository();

  const rows =
    channel === "contact"
      ? await repo.listContactRequests()
      : channel === "support"
        ? await repo.listSupportRequests()
        : channel === "partner"
          ? await repo.listPartnerRequests()
          : await repo.listPressRequests();

  return rows.find((row) => row.id === id) ?? null;
}

export async function POST(request: Request) {
  const access = await getStaffAccess();

  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        access.status === 401
          ? "Sie müssen angemeldet sein."
          : "Support- oder Administratorrechte erforderlich."
      ),
      {
        status: access.status,
      }
    );
  }

  const originError = validateMutationOrigin(request);
  if (originError) return originError;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen."
      ),
      {
        status: 400,
      }
    );
  }

  const { channel, id, subject, message } = parsed.data;

  const record = await findRequest(channel, id);

  if (!record) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Anfrage wurde nicht gefunden."),
      {
        status: 404,
      }
    );
  }

  const account = channel as MailAccountKey;

  const runtime = await resolveMailAccountRuntime(account);

  if (!runtime.enabled) {
    await recordCommunicationHistory({
      actor: access.user,
      channel,
      requestId: id,
      action: "reply",
      statusFrom: record.status,
      statusTo: record.status,
      subject,
      body: message,
      deliveryStatus: "disabled",
      provider: "smtp",
      errorMessage: "SMTP-Postfach ist deaktiviert.",
    });

    return NextResponse.json(
      apiError(
        "MAIL_DISABLED",
        "Das SMTP-Postfach dieses Bereichs ist deaktiviert."
      ),
      {
        status: 409,
      }
    );
  }

  if (!runtime.config) {
    await recordCommunicationHistory({
      actor: access.user,
      channel,
      requestId: id,
      action: "reply",
      statusFrom: record.status,
      statusTo: record.status,
      subject,
      body: message,
      deliveryStatus: "failed",
      provider: "smtp",
      errorMessage: runtime.error ?? "SMTP-Konfiguration ist unvollständig.",
    });

    return NextResponse.json(
      apiError(
        "MAIL_NOT_CONFIGURED",
        "Das SMTP-Postfach ist nicht vollständig konfiguriert."
      ),
      {
        status: 409,
      }
    );
  }

  const text =
    `Hallo ${record.name},\n\n` +
    `${message}\n\n` +
    `Viele Grüße\n` +
    `Ihr SynSight-Team`;

  const html =
    `<p>Hallo ${escapeHtml(record.name)},</p>` +
    `<p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>` +
    `<p>Viele Grüße<br>Ihr SynSight-Team</p>`;

  let delivery: {
    messageId?: string;
    via: string;
  };

  try {
    delivery = await sendSmtpMail(runtime.config, {
      from: runtime.config.SMTP_FROM ?? runtime.config.SMTP_USER ?? "SynSight",
      to: record.email,
      subject,
      text,
      html,
    });
  } catch (error) {
    const safe = sanitizeSmtpError(error);

    try {
      await recordCommunicationHistory({
        actor: access.user,
        channel,
        requestId: id,
        action: "reply",
        statusFrom: record.status,
        statusTo: record.status,
        subject,
        body: message,
        deliveryStatus: "failed",
        provider: "smtp",
        errorMessage: safe,
        metaJson: {
          to: record.email,
        },
      });
    } catch (historyError) {
      console.error(
        "[communications.reply] failed delivery history could not be recorded",
        historyError
      );
    }

    return NextResponse.json(
      apiError(
        "MAIL_DELIVERY_FAILED",
        `Antwort konnte nicht zugestellt werden. ${safe}`
      ),
      {
        status: 502,
      }
    );
  }

  /*
   * Ab hier ist die E-Mail definitiv versendet.
   * Fehler bei Ticketstatus oder Historie dürfen deshalb NICHT
   * mehr als SMTP-/Versandfehler ausgegeben werden.
   */
  let ticketStatusUpdated = false;
  let historyRecorded = false;
  let updatedRequest: unknown = null;

  try {
    const repo = getCommunicationsRepository();

    updatedRequest = await repo.updateRequestStatus({
      channel,
      id,
      status: "answered",
      adminNotes: record.adminNotes,
    });

    ticketStatusUpdated = Boolean(updatedRequest);
  } catch (statusError) {
    console.error(
      "[communications.reply] mail delivered but ticket status update failed",
      statusError
    );
  }

  try {
    await recordCommunicationHistory({
      actor: access.user,
      channel,
      requestId: id,
      action: "reply",
      statusFrom: record.status,
      statusTo: ticketStatusUpdated ? "answered" : record.status,
      subject,
      body: message,
      deliveryStatus: "delivered",
      provider: "smtp",
      messageId: delivery.messageId ?? null,
      metaJson: {
        to: record.email,
        via: delivery.via,
        ticketStatusUpdated,
      },
    });

    historyRecorded = true;
  } catch (historyError) {
    console.error(
      "[communications.reply] mail delivered but history recording failed",
      historyError
    );
  }

  return NextResponse.json(
    apiSuccess({
      delivered: true,
      messageId: delivery.messageId ?? null,
      via: delivery.via,
      request: updatedRequest,
      ticketStatusUpdated,
      historyRecorded,
      warning:
        !ticketStatusUpdated || !historyRecorded
          ? "Die E-Mail wurde versendet, aber interne Ticketdaten konnten nicht vollständig aktualisiert werden."
          : null,
    })
  );
}
