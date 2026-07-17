"use client";

import RequestFormShell from "./RequestFormShell";

export default function PartnerForm() {
  return (
    <RequestFormShell
      endpoint="/api/partners"
      submitLabel="Partnerschaft anfragen"
      successTitle="Partnerschaftsanfrage empfangen"
      initialValues={{
        name: "",
        company: "",
        email: "",
        partnershipType: "",
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
          label: "Unternehmen",
          required: true,
          autoComplete: "organization",
          placeholder: "Firmenname",
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
          name: "partnershipType",
          label: "Art der Partnerschaft",
          type: "select",
          required: true,
          options: [
            { value: "Technologiepartner", label: "Technologiepartner" },
            { value: "Unternehmen", label: "Unternehmen" },
            { value: "Integrationen", label: "Integrationen" },
            { value: "Kooperationen", label: "Kooperationen" },
            { value: "Sonstiges", label: "Sonstiges" },
          ],
        },
        {
          name: "message",
          label: "Nachricht",
          type: "textarea",
          required: true,
          rows: 6,
          placeholder: "Beschreiben Sie Ihre Kooperationsidee…",
        },
      ]}
    />
  );
}
