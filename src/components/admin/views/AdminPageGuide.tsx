import { ADMIN_SECTIONS } from "@/lib/admin/navigation";

type ExtraGuide = {
  recommendation?: string;
  warning?: string;
};

const EXTRA: Record<string, ExtraGuide> = {
  "user-overview": {
    recommendation:
      "Für einen schnellen Überblick über Konten, Rollen und Auffälligkeiten verwenden. Detailänderungen anschließend in den jeweiligen Unterbereichen durchführen.",
  },
  "user-management": {
    recommendation:
      "Benutzer zuerst suchen und das Profil öffnen, bevor Status, Rolle oder Guthaben verändert werden.",
    warning:
      "Kontostatus oder Rollen nur ändern, wenn der Grund eindeutig ist.",
  },
  "user-access": {
    recommendation:
      "Rollen und Zugriffsrechte möglichst sparsam vergeben. Normale Kunden sollten die Rolle „user“ behalten.",
    warning:
      "Administratorrechte geben Zugriff auf sensible Systemeinstellungen.",
  },
  "user-verification": {
    recommendation:
      "Manuelle Verifizierung nur verwenden, wenn die Identität bzw. der Verifizierungsfall nachvollziehbar ist.",
  },
  "user-blocked": {
    recommendation:
      "Gesperrte Konten prüfen, bevor sie wieder freigegeben werden.",
  },
  "user-credits-adjust": {
    recommendation:
      "Manuelle SynCredit-Gutschriften mit nachvollziehbarem Grund verwenden.",
    warning:
      "SynCredits haben einen wirtschaftlichen Gegenwert und können reale API-Kosten erzeugen.",
  },

  "analysis-overview": {
    recommendation:
      "Module nur aktivieren, wenn Backend, Preis und benötigte API vollständig eingerichtet sind.",
  },
  "analysis-username": {
    recommendation:
      "Die voreingestellten Such- und Qualitätswerte nur verändern, wenn Tests zeigen, dass mehr oder weniger Suchumfang sinnvoll ist.",
  },
  "analysis-digital-leak": {
    recommendation:
      "Retention, Trefferlogik und Provider-Einstellungen immer mit Datenschutz und realen API-Kosten zusammen betrachten.",
  },
  "analysis-reverse-image": {
    recommendation:
      "Schwellenwerte nur schrittweise ändern. Zu niedrige Werte erhöhen Fehlzuordnungen, zu hohe Werte können echte Treffer ausblenden.",
  },

  "seo-knowledge-list": {
    recommendation:
      "Beiträge zunächst als Entwurf erstellen, SEO-Daten prüfen und erst danach veröffentlichen.",
    warning: "KI-Vorschläge nicht ungeprüft veröffentlichen.",
  },
  "seo-knowledge-trash": {
    recommendation:
      "Gelöschte Inhalte zunächst im Papierkorb belassen, wenn eine Wiederherstellung noch möglich sein soll.",
    warning:
      "Endgültiges Löschen kann nicht über den normalen Papierkorb rückgängig gemacht werden.",
  },
  "website-images": {
    recommendation:
      "Die vorhandenen Standardwerte sind ein guter Ausgangspunkt für Qualität und Speicherverbrauch.",
    warning:
      "Sehr hohe Auflösung oder Bildqualität erhöht Speicherbedarf und Verarbeitungszeit.",
  },
  "website-contact-settings": {
    recommendation:
      "Für jede öffentliche Funktion ein eindeutig zuständiges Postfach verwenden und Änderungen anschließend mit einem Formular-Test prüfen.",
    warning:
      "Diese Adressen beeinflussen neue öffentliche Anfragen. SMTP-Zugangsdaten werden hier nicht verändert.",
  },

  "website-api": {
    recommendation:
      "Zugangsdaten erst speichern, anschließend die Verbindung testen und den Anbieter erst dann produktiv verwenden.",
    warning:
      "API-Zugang und API-Kosten sind getrennte Bereiche. Preise werden unter Geschäft & Finanzen gepflegt.",
  },

  "finance-overview": {
    recommendation:
      "Einnahmen, API-Kosten, Werbung und Deckungsbeitrag immer gemeinsam bewerten.",
  },
  "finance-api-costs": {
    recommendation:
      "Nur reale Anbieterpreise eintragen. Diese Werte beeinflussen die Wirtschaftlichkeitsberechnung der Analysen.",
  },
  "finance-advertising": {
    recommendation:
      "Kampagnen nach Conversions, CPA und ROAS beurteilen – nicht nur nach Impressionen oder Klicks.",
  },
  "finance-providers": {
    recommendation:
      "Neue Zahlungsanbieter zuerst im Testmodus prüfen und erst danach auf Live umstellen.",
  },
  "marketing-pricing": {
    recommendation:
      "Preise so wählen, dass reale API-Kosten und ein wirtschaftlicher Puffer gedeckt bleiben.",
  },
  "marketing-promotions": {
    recommendation:
      "Bei größeren Aktionen Teilnehmer- oder Credit-Budget begrenzen.",
    warning:
      "Verschenkte SynCredits können später reale Analyse- und API-Kosten verursachen.",
  },

  "support-messages": {
    recommendation:
      "Neue Anfragen zuerst einordnen, anschließend Status und interne Bearbeitung nachvollziehbar halten.",
  },
  "support-user-search": {
    recommendation:
      "Für Supportfälle verwenden. Kontenänderungen anschließend im Bereich Benutzer & Konten durchführen.",
  },

  "website-system": {
    recommendation:
      "Diese Seite primär zur Diagnose verwenden. Änderungen erst durchführen, wenn ein konkretes Problem erkannt wurde.",
  },
  "website-ki-server": {
    recommendation:
      "Auslastung, Erreichbarkeit und Fehler beobachten, bevor Analyseprobleme auf Anwendungsebene gesucht werden.",
  },
  "user-audit": {
    recommendation:
      "Bei ungewöhnlichen Konto-, Login- oder Admin-Aktivitäten zuerst hier den zeitlichen Ablauf prüfen.",
    warning:
      "Auditdaten dienen der Nachvollziehbarkeit und sollten nicht als normale Arbeitsdaten behandelt werden.",
  },
};

function getNavigationInfo(view: string) {
  for (const section of ADMIN_SECTIONS) {
    const item = section.items.find((entry) => entry.view === view);
    if (item) {
      return {
        section: section.title,
        label: item.label,
        description: item.description,
        help: item.help,
      };
    }
  }

  return null;
}

export default function AdminPageGuide({ view }: { view: string }) {
  const nav = getNavigationInfo(view);
  const extra = EXTRA[view];

  if (!nav && !extra) return null;

  return (
    <section className="mb-6 rounded-[1.2rem] border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
      <p className="font-mono text-[8px] tracking-[.15em] text-cyber-cyan/55">
        SEITENHILFE · {nav?.section?.toUpperCase() ?? "ADMIN"}
      </p>

      <h2 className="mt-2 text-base font-semibold text-white/85">
        Wofür ist „{nav?.label ?? view}“?
      </h2>

      {nav?.description ? (
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/55">
          {nav.description}
        </p>
      ) : null}

      {nav?.help ? (
        <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
          <p className="font-mono text-[8px] tracking-[.12em] text-white/30">
            WAS PASSIERT HIER?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            {nav.help}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {extra?.recommendation ? (
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] px-4 py-3">
            <p className="font-mono text-[8px] tracking-[.12em] text-emerald-100/55">
              EMPFEHLUNG
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-50/60">
              {extra.recommendation}
            </p>
          </div>
        ) : null}

        {extra?.warning ? (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-4 py-3">
            <p className="font-mono text-[8px] tracking-[.12em] text-amber-100/55">
              DARAUF ACHTEN
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-50/60">
              {extra.warning}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
