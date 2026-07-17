/**
 * Compatibility re-export — prefer `@/lib/email/email-service`.
 */
export {
  sendContactNotification,
  sendPressNotification,
  sendPartnerNotification,
  resolveNotificationRecipient,
  type EmailChannel,
  type EmailDispatchResult,
  type EmailNotificationPayload,
} from "@/lib/email/email-service";
