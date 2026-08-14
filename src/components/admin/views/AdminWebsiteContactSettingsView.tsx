"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ApiResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

type AccountKey =
  "contact" | "support" | "press" | "partner" | "privacy" | "system";

interface ContactSettings {
  contactEmail: string;
  pressEmail: string;
  partnersEmail: string;
  supportEmail: string;
  privacyEmail: string;
}

interface MailAccount {
  key: AccountKey;
  label: string;
  enabled: boolean;
  configured: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  passwordConfigured: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

interface MailSettings {
  server: {
    host: string;
    port: number;
    secure: boolean;
  };
  accounts: Record<AccountKey, MailAccount>;
}

const KEYS: AccountKey[] = [
  "contact",
  "support",
  "press",
  "partner",
  "privacy",
  "system",
];

const PURPOSE: Record<AccountKey, string> = {
  contact:
    "Kontaktformular: intern immer speichern, optional zusätzlich per E-Mail benachrichtigen.",
  support:
    "Support-Tickets: immer in A6 speichern. E-Mail dient nur als zusätzliche Benachrichtigung.",
  press:
    "Presseformular: intern speichern und optional Pressepostfach informieren.",
  partner:
    "Partnerschaftsanfragen: intern speichern und optional per E-Mail informieren.",
  privacy: "Datenschutzpostfach für Datenschutz- und Betroffenenkommunikation.",
  system:
    "Registrierung, E-Mail-Verifizierung und Passwort-Reset. Hier empfiehlt sich noreply@synsight.de.",
};

const CONTACT_DEFAULTS: ContactSettings = {
  contactEmail: "contact@synsight.de",
  pressEmail: "press@synsight.de",
  partnersEmail: "partners@synsight.de",
  supportEmail: "support@synsight.de",
  privacyEmail: "datenschutz@synsight.de",
};

export default function AdminWebsiteContactSettingsView() {
  const [contacts, setContacts] = useState<ContactSettings>(CONTACT_DEFAULTS);

  const [mail, setMail] = useState<MailSettings | null>(null);

  const [passwords, setPasswords] = useState<
    Partial<Record<AccountKey, string>>
  >({});

  const [testRecipient, setTestRecipient] = useState("");
  const [busy, setBusy] = useState<AccountKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const [c, m] = await Promise.all([
        fetch("/api/admin/website/contact-settings", {
          cache: "no-store",
        }),
        fetch("/api/admin/website/mail-settings", {
          cache: "no-store",
        }),
      ]);

      const cr = (await c.json()) as ApiResult<ContactSettings>;
      const mr = (await m.json()) as ApiResult<MailSettings>;

      if (!c.ok || !cr.success) {
        throw new Error(
          cr.success
            ? "Kontaktadressen konnten nicht geladen werden."
            : cr.error.message
        );
      }

      if (!m.ok || !mr.success) {
        throw new Error(
          mr.success
            ? "SMTP-Einstellungen konnten nicht geladen werden."
            : mr.error.message
        );
      }

      setContacts(cr.data);
      setMail(mr.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveContacts(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/website/contact-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contacts),
    });

    const result = (await response.json()) as ApiResult<ContactSettings>;

    if (!response.ok || !result.success) {
      setError(
        result.success ? "Speichern fehlgeschlagen." : result.error.message
      );
      return;
    }

    setContacts(result.data);
    setMessage("Kontaktadressen gespeichert.");
  }

  async function saveMail(e: FormEvent) {
    e.preventDefault();
    if (!mail) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    const accounts = Object.fromEntries(
      KEYS.map((key) => [
        key,
        {
          enabled: mail.accounts[key].enabled,
          username: mail.accounts[key].username,
          password: passwords[key] || undefined,
          fromName: mail.accounts[key].fromName,
          fromEmail: mail.accounts[key].fromEmail,
        },
      ])
    );

    try {
      const response = await fetch("/api/admin/website/mail-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: mail.server,
          accounts,
        }),
      });

      const result = (await response.json()) as ApiResult<MailSettings>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success
            ? "SMTP-Speichern fehlgeschlagen."
            : result.error.message
        );
      }

      setMail(result.data);
      setPasswords({});
      setMessage("Alle SMTP-Konten gespeichert.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function test(account: AccountKey, sendMail = false) {
    setBusy(account);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/website/mail-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sendMail
            ? {
                action: "send_test",
                account,
                to: testRecipient,
              }
            : {
                action: "verify",
                account,
              }
        ),
      });

      const result = (await response.json()) as ApiResult<{
        ok: boolean;
        message: string;
      }>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "Test fehlgeschlagen." : result.error.message
        );
      }

      if (result.data.ok) {
        setMessage(result.data.message);
      } else {
        setError(result.data.message);
      }

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SMTP-Test fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  if (!mail) {
    return (
      <p className="text-sm text-white/45">
        Kontakt- und Mail-Einstellungen werden geladen…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.4rem] border border-white/[0.07] bg-white/[0.015] p-5 md:p-6">
        <p className="font-mono text-[8px] tracking-[.16em] text-cyber-cyan/55">
          WEBSITE / E-MAIL COMMAND CENTER
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white/85">
          Kontakt & E-Mail
        </h2>

        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-white/45">
          Öffentliche Formulare werden immer intern gespeichert. Der
          E-Mail-Schalter eines Kontos aktiviert nur die zusätzliche
          Benachrichtigung über das jeweilige Postfach.
        </p>
      </section>

      {message && (
        <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4 text-sm text-emerald-100/70">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-rose-300/20 bg-rose-300/[0.04] p-4 text-sm text-rose-100/70">
          {error}
        </p>
      )}

      <section className="rounded-[1.3rem] border border-white/[0.07] p-5">
        <h3 className="text-lg text-white/80">Öffentliche Empfänger</h3>

        <form
          onSubmit={saveContacts}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          {(
            [
              ["contactEmail", "Kontakt"],
              ["supportEmail", "Support"],
              ["pressEmail", "Presse"],
              ["partnersEmail", "Partnerschaften"],
              ["privacyEmail", "Datenschutz"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block font-mono text-[8px] text-white/35">
                {label.toUpperCase()}
              </span>
              <input
                type="email"
                required
                value={contacts[key]}
                onChange={(e) =>
                  setContacts((v) => ({
                    ...v,
                    [key]: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/80"
              />
            </label>
          ))}

          <div className="md:col-span-2">
            <button className="rounded-xl border border-cyber-cyan/30 px-5 py-3 font-mono text-[9px] text-cyber-cyan">
              EMPFÄNGER SPEICHERN
            </button>
          </div>
        </form>
      </section>

      <form onSubmit={saveMail} className="space-y-5">
        <section className="rounded-[1.3rem] border border-white/[0.07] p-5">
          <h3 className="text-lg text-white/80">Gemeinsamer Mailserver</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block font-mono text-[8px] text-white/35">
                SMTP HOST
              </span>
              <input
                value={mail.server.host}
                onChange={(e) =>
                  setMail({
                    ...mail,
                    server: {
                      ...mail.server,
                      host: e.target.value,
                    },
                  })
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-white/80"
              />
            </label>

            <label>
              <span className="mb-2 block font-mono text-[8px] text-white/35">
                PORT
              </span>
              <input
                type="number"
                value={mail.server.port}
                onChange={(e) =>
                  setMail({
                    ...mail,
                    server: {
                      ...mail.server,
                      port: Number(e.target.value),
                    },
                  })
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-white/80"
              />
            </label>

            <label className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                checked={mail.server.secure}
                onChange={(e) =>
                  setMail({
                    ...mail,
                    server: {
                      ...mail.server,
                      secure: e.target.checked,
                    },
                  })
                }
              />
              <span className="text-sm text-white/60">SSL/TLS direkt</span>
            </label>
          </div>
        </section>

        {KEYS.map((key) => {
          const account = mail.accounts[key];

          return (
            <section
              key={key}
              className="rounded-[1.3rem] border border-white/[0.07] bg-white/[0.015] p-5"
            >
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] text-cyber-cyan/60">
                    {account.label.toUpperCase()}
                  </p>
                  <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/40">
                    {PURPOSE[key]}
                  </p>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={account.enabled}
                    onChange={(e) =>
                      setMail({
                        ...mail,
                        accounts: {
                          ...mail.accounts,
                          [key]: {
                            ...account,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  <span className="text-xs text-white/55">E-Mail aktiv</span>
                </label>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  placeholder="SMTP Benutzer"
                  value={account.username}
                  onChange={(e) =>
                    setMail({
                      ...mail,
                      accounts: {
                        ...mail.accounts,
                        [key]: {
                          ...account,
                          username: e.target.value,
                        },
                      },
                    })
                  }
                  className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/80"
                />

                <input
                  type="password"
                  placeholder={
                    account.passwordConfigured
                      ? "Passwort gespeichert · leer = unverändert"
                      : "SMTP Passwort"
                  }
                  value={passwords[key] ?? ""}
                  onChange={(e) =>
                    setPasswords((v) => ({
                      ...v,
                      [key]: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/80"
                />

                <input
                  placeholder="Absendername"
                  value={account.fromName}
                  onChange={(e) =>
                    setMail({
                      ...mail,
                      accounts: {
                        ...mail.accounts,
                        [key]: {
                          ...account,
                          fromName: e.target.value,
                        },
                      },
                    })
                  }
                  className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/80"
                />

                <input
                  type="email"
                  placeholder="Absender E-Mail"
                  value={account.fromEmail}
                  onChange={(e) =>
                    setMail({
                      ...mail,
                      accounts: {
                        ...mail.accounts,
                        [key]: {
                          ...account,
                          fromEmail: e.target.value,
                        },
                      },
                    })
                  }
                  className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/80"
                />
              </div>

              {account.lastErrorMessage && (
                <p className="mt-3 rounded-lg border border-rose-300/15 p-3 text-xs text-rose-100/60">
                  {account.lastErrorMessage}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void test(key)}
                  className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[8px] text-white/50"
                >
                  VERBINDUNG TESTEN
                </button>

                <button
                  type="button"
                  disabled={busy !== null || !testRecipient}
                  onClick={() => void test(key, true)}
                  className="rounded-lg border border-emerald-300/20 px-3 py-2 font-mono text-[8px] text-emerald-100/65"
                >
                  TESTMAIL SENDEN
                </button>
              </div>
            </section>
          );
        })}

        <section className="rounded-[1.3rem] border border-white/[0.07] p-5">
          <label className="block">
            <span className="mb-2 block font-mono text-[8px] text-white/35">
              TESTMAIL EMPFÄNGER
            </span>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="deine externe Testadresse"
              className="w-full max-w-xl rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/80"
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-cyber-cyan/30 bg-cyber-cyan/[0.08] px-6 py-3 font-mono text-[9px] text-cyber-cyan"
        >
          {saving ? "SPEICHERT…" : "ALLE SMTP-KONTEN SPEICHERN"}
        </button>
      </form>
    </div>
  );
}
