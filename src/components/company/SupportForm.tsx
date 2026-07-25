"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import RequestFormShell from "./RequestFormShell";

export default function SupportForm() {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject") ?? "";
  const initialValues = useMemo(
    () => ({
      name: "",
      company: "",
      email: "",
      phone: "",
      subject,
      message: "",
    }),
    [subject]
  );

  return (
    <RequestFormShell
      key={subject}
      endpoint="/api/support"
      submitLabel="Supportanfrage senden"
      successTitle="Supportanfrage empfangen"
      initialValues={initialValues}
      fields={[
        {
          name: "name",
          label: "Name",
          required: true,
          autoComplete: "name",
          placeholder: "Ihr vollständiger Name",
        },
        {
          name: "company",
          label: "Firma",
          optional: true,
          autoComplete: "organization",
          placeholder: "Unternehmen (optional)",
        },
        {
          name: "email",
          label: "E-Mail",
          type: "email",
          required: true,
          autoComplete: "email",
          placeholder: "name@unternehmen.de",
        },
        {
          name: "phone",
          label: "Telefon",
          type: "tel",
          optional: true,
          autoComplete: "tel",
          placeholder: "+49 …",
        },
        {
          name: "subject",
          label: "Betreff",
          required: true,
          placeholder: "Wobei können wir helfen?",
        },
        {
          name: "message",
          label: "Nachricht",
          type: "textarea",
          required: true,
          rows: 6,
          placeholder:
            "Beschreiben Sie Ihr Anliegen, betroffene Funktionen und relevante Schritte…",
        },
      ]}
    />
  );
}
