"use client";

import RequestFormShell from "./RequestFormShell";

export default function ContactForm() {
  return (
    <RequestFormShell
      endpoint="/api/contact"
      submitLabel="Nachricht senden"
      successTitle="Nachricht empfangen"
      initialValues={{
        name: "",
        company: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      }}
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
          placeholder: "Worum geht es?",
        },
        {
          name: "message",
          label: "Nachricht",
          type: "textarea",
          required: true,
          rows: 6,
          placeholder: "Ihre Nachricht an das SynSight Team…",
        },
      ]}
    />
  );
}
