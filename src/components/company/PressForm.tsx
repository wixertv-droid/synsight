"use client";

import RequestFormShell from "./RequestFormShell";

export default function PressForm() {
  return (
    <RequestFormShell
      endpoint="/api/press"
      submitLabel="Presseanfrage senden"
      successTitle="Presseanfrage empfangen"
      initialValues={{
        name: "",
        medium: "",
        email: "",
        phone: "",
        topic: "",
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
          name: "medium",
          label: "Medium",
          required: true,
          placeholder: "Redaktion / Medium",
        },
        {
          name: "email",
          label: "E-Mail",
          type: "email",
          required: true,
          autoComplete: "email",
          placeholder: "redaktion@medium.de",
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
          name: "topic",
          label: "Thema",
          required: true,
          placeholder: "Interview, Statement, Hintergrund…",
        },
        {
          name: "message",
          label: "Nachricht",
          type: "textarea",
          required: true,
          rows: 6,
          placeholder: "Ihre Presseanfrage…",
        },
      ]}
    />
  );
}
