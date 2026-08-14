type GuideMode =
  | "overview"
  | "advertising"
  | "api-costs"
  | "payment-providers"
  | "pricing"
  | "order-pricing"
  | "promotions";

type GuideItem = {
  label: string;
  text: string;
  recommendation?: string;
  warning?: string;
};

type GuideContent = {
  title: string;
  intro: string;
  items: GuideItem[];
  important?: string;
};

const GUIDES: Record<GuideMode, GuideContent> = {
  overview: {
    title: "So lesen Sie die Finanzübersicht",
    intro:
      "Diese Seite zeigt die wirtschaftliche Entwicklung von SynSight. Die Werte der letzten 14 Tage werden bewusst getrennt nach Einnahmen, technischen API-Kosten und Werbung dargestellt.",
    important:
      "Der Deckungsbeitrag ist nicht automatisch der steuerliche Unternehmensgewinn. Server, Domains, Personal, Steuern und andere Betriebskosten sind hier derzeit nicht enthalten.",
    items: [
      {
        label: "Einnahmen",
        text: "Abgeschlossene Kundenzahlungen, die im gewählten Zeitraum als erfolgreich verbucht wurden.",
        recommendation:
          "Mit Gesamtausgaben und Deckungsbeitrag zusammen betrachten – Umsatz allein sagt noch nichts über die Wirtschaftlichkeit aus.",
      },
      {
        label: "API-Kosten",
        text: "Kosten der technischen Dienste wie SerpAPI, Gemini oder anderer kostenpflichtiger Analyseanbieter.",
        recommendation:
          "Bei stark steigenden Kosten prüfen, welche Analyse oder welcher Provider die meisten Ausgaben erzeugt.",
      },
      {
        label: "Werbekosten",
        text: "Tatsächlich erfasste Werbeausgaben aus dem Bereich Werbung & Kampagnen.",
        recommendation:
          "Nicht isoliert beurteilen. Entscheidend ist, ob die Werbung Registrierungen, Käufe oder andere gewünschte Conversions erzeugt.",
      },
      {
        label: "Gesamtausgaben",
        text: "API-Kosten plus Werbekosten im dargestellten Zeitraum.",
        recommendation:
          "Dieser Wert zeigt die derzeit direkt erfassten variablen Kosten von SynSight.",
      },
      {
        label: "Deckungsbeitrag",
        text: "Einnahmen minus API-Kosten minus Werbekosten.",
        recommendation:
          "Ein positiver Deckungsbeitrag ist grundsätzlich gut. Er muss aber noch weitere Unternehmensausgaben tragen.",
      },
      {
        label: "API Calls",
        text: "Anzahl der protokollierten API-Aufrufe. Viele Calls sind nicht automatisch schlecht, solange ihr wirtschaftlicher Nutzen stimmt.",
      },
    ],
  },

  advertising: {
    title: "Werbung richtig bewerten",
    intro:
      "Hier verwalten Sie Werbekampagnen und deren tatsächliche Leistung. Klicks allein sind kein gutes Erfolgsmaß – für SynSight sind Conversions, CPA und ROAS wesentlich aussagekräftiger.",
    important:
      "Die hier gespeicherten Ausgaben fließen direkt in die Finanzübersicht ein. Tragen Sie deshalb bei manueller Pflege nur tatsächliche Werbeausgaben ein und nicht zusätzlich geplante Budgets.",
    items: [
      {
        label: "Budget",
        text: "Der geplante finanzielle Rahmen einer Kampagne. Das Budget ist noch keine tatsächliche Ausgabe.",
        recommendation:
          "Gesamtbudget als Obergrenze verwenden. Tagesbudget begrenzt den ungefähren täglichen Verbrauch.",
      },
      {
        label: "Ausgegeben / Spend",
        text: "Das Geld, das tatsächlich bereits für die Kampagne ausgegeben wurde.",
        warning: "Dieser Wert beeinflusst direkt die SynSight-Finanzübersicht.",
      },
      {
        label: "Impressionen",
        text: "Wie oft eine Anzeige eingeblendet wurde. Eine Person kann mehrere Impressionen erzeugen.",
        recommendation: "Nur zusammen mit Klickrate und Conversions bewerten.",
      },
      {
        label: "Reichweite",
        text: "Wie viele unterschiedliche Personen die Werbung ungefähr erreicht hat.",
      },
      {
        label: "Klicks",
        text: "Anzahl der Klicks auf die Anzeige oder den zugehörigen Call-to-Action.",
        warning:
          "Viele Klicks ohne Registrierungen oder Käufe können trotzdem schlechte Werbung bedeuten.",
      },
      {
        label: "CTR",
        text: "Click-Through-Rate: Anteil der Impressionen, die zu einem Klick geführt haben.",
        recommendation:
          "Eine steigende CTR deutet meist auf relevantere Anzeigen hin. Trotzdem immer die Conversion-Qualität prüfen.",
      },
      {
        label: "CPC",
        text: "Cost per Click: durchschnittliche Werbekosten für einen Klick.",
        recommendation:
          "Niedriger ist grundsätzlich gut – aber billige, wertlose Klicks helfen SynSight nicht.",
      },
      {
        label: "CPM",
        text: "Kosten pro 1.000 Impressionen. Besonders hilfreich bei Reichweiten- oder Bekanntheitskampagnen.",
      },
      {
        label: "Conversion",
        text: "Eine gewünschte Handlung, z. B. Registrierung, Kauf oder eine andere definierte Zielaktion.",
        recommendation:
          "Vor Kampagnenstart eindeutig festlegen, was für diese Kampagne als Conversion zählt.",
      },
      {
        label: "Conversion Rate",
        text: "Anteil der Klicks, die anschließend eine Conversion erzeugen.",
      },
      {
        label: "CPA",
        text: "Cost per Acquisition/Action: durchschnittliche Werbekosten pro Conversion.",
        recommendation:
          "Für SynSight meist deutlich wichtiger als CPC. CPA sollte langfristig unter dem wirtschaftlichen Wert eines gewonnenen Kunden liegen.",
      },
      {
        label: "Conversion-Wert",
        text: "Der einer Conversion zugerechnete finanzielle Wert bzw. Umsatz.",
        warning:
          "Nur echte oder sinnvoll definierte Werte eintragen, sonst wird der ROAS irreführend.",
      },
      {
        label: "ROAS",
        text: "Return on Ad Spend: Conversion-Wert geteilt durch Werbekosten. 2,0× bedeutet 2 € zugeordneter Wert je 1 € Werbung.",
        recommendation:
          "Unter 1,0× liegt der zugeordnete Wert unter den Werbekosten. Ob eine Kampagne trotzdem sinnvoll ist, hängt z. B. vom späteren Kundenwert ab.",
      },
      {
        label: "Landingpage",
        text: "Die Seite, auf der ein Nutzer nach dem Klick landet.",
        recommendation: "Immer möglichst genau zur Werbeaussage passen lassen.",
      },
      {
        label: "UTM-Parameter",
        text: "Kennzeichnungen in Links, mit denen später erkannt werden kann, aus welcher Plattform und Kampagne ein Besucher kam.",
        recommendation:
          "Für bezahlte Kampagnen konsequent verwenden, damit Quellen später sauber vergleichbar bleiben.",
      },
      {
        label: "Zielgruppe / Region",
        text: "Beschreibt, wen die Werbung erreichen soll und in welchem geografischen Gebiet sie ausgespielt wird.",
        recommendation:
          "Nicht unnötig breit beginnen. Lieber mit einer klar definierten Zielgruppe testen und anhand der Ergebnisse erweitern.",
      },
    ],
  },

  "api-costs": {
    title: "API-Kosten & Wirtschaftlichkeit verstehen",
    intro:
      "Hier werden technische Kosten zentral gepflegt. Diese Werte werden von den Analysen verwendet, um reale Kosten und die Wirtschaftlichkeit der Module zu berechnen.",
    important:
      "Providerpreise nur ändern, wenn sich der tatsächliche Tarif des Anbieters geändert hat. Falsche Werte verfälschen alle Kosten- und Gewinnberechnungen.",
    items: [
      {
        label: "Pro Request",
        text: "Der Anbieter berechnet einen festen Preis pro erfolgreicher Anfrage.",
        recommendation:
          "Für Dienste wie klassische Search-APIs verwenden, wenn der Tarif tatsächlich requestbasiert ist.",
      },
      {
        label: "Pro Token",
        text: "Kosten werden anhand der tatsächlich verwendeten Input- und Output-Tokens berechnet.",
        recommendation:
          "Für KI-Anbieter verwenden, wenn deren Abrechnung tokenbasiert erfolgt.",
      },
      {
        label: "Input-Tokens",
        text: "Informationen, Prompts und Kontext, die an das KI-Modell gesendet werden.",
      },
      {
        label: "Output-Tokens",
        text: "Vom KI-Modell erzeugter Text bzw. erzeugte Antwortmenge.",
      },
      {
        label: "Provider-Code",
        text: "Technische interne Kennung. Sie verbindet Kosten mit protokollierten API-Ereignissen.",
        warning: "Bestehende Codes nicht ohne technische Prüfung umbenennen.",
      },
      {
        label: "API-Ereignisse",
        text: "Protokollierte reale Aufrufe mit Provider, Kosten, Zeitpunkt und technischen Metadaten.",
        recommendation:
          "Bei unerwartet hohen Kosten zuerst hier nach ungewöhnlich vielen oder teuren Anfragen suchen.",
      },
      {
        label: "SynCredits",
        text: "Kundenpreis einer Analyse innerhalb des SynSight-Guthabensystems.",
        recommendation:
          "So setzen, dass die realen API-Kosten plus gewünschter wirtschaftlicher Puffer gedeckt sind.",
      },
      {
        label: "Mindestgewinn",
        text: "Interne Untergrenze für den gewünschten Überschuss einer Analyse.",
        warning:
          "Ist keine Garantie für Unternehmensgewinn, weil weitere Betriebskosten hier nicht enthalten sind.",
      },
      {
        label: "Credit-Wert",
        text: "Interner Euro-Gegenwert eines SynCredits für die Wirtschaftlichkeitsberechnung.",
        recommendation:
          "Nur ändern, wenn sich die grundsätzliche SynCredit-Preislogik ändert.",
      },
    ],
  },

  "payment-providers": {
    title: "Zahlungsanbieter sicher konfigurieren",
    intro:
      "Hier werden Zahlungsdienste wie Stripe oder PayPal eingerichtet. Zugangsdaten und Webhook-Secrets werden getrennt von den sichtbaren Finanzdaten gespeichert.",
    important:
      "Neue Zahlungsanbieter zuerst im Testmodus vollständig prüfen. Erst danach Live-Modus und aktive Kunden-Checkouts freigeben.",
    items: [
      {
        label: "Code",
        text: "Interne technische Kennung des Zahlungsanbieters, z. B. stripe.",
        warning:
          "Bei einem bestehenden Provider nicht ohne technische Prüfung ändern.",
      },
      {
        label: "Test",
        text: "Sandbox-/Testumgebung ohne echte Kundenzahlungen.",
        recommendation:
          "Für Einrichtung, Checkout-Tests und Webhook-Tests verwenden.",
      },
      {
        label: "Live",
        text: "Produktivmodus mit echten Zahlungen.",
        warning:
          "Erst aktivieren, wenn Keys, Checkout und Webhooks erfolgreich getestet wurden.",
      },
      {
        label: "API-Key",
        text: "Authentifiziert SynSight beim Zahlungsanbieter.",
        recommendation:
          "Nur den zur gewählten Test- oder Live-Umgebung passenden Key verwenden.",
      },
      {
        label: "Webhook-Secret",
        text: "Damit prüft SynSight, ob Zahlungsbenachrichtigungen tatsächlich vom Zahlungsanbieter stammen.",
        warning: "Nicht mit dem normalen API-Key verwechseln.",
      },
      {
        label: "Checkout aktiv",
        text: "Legt fest, ob dieser Anbieter für Kunden zum Bezahlen verwendet werden darf.",
      },
      {
        label: "Provider aktiv",
        text: "Schaltet die Integration grundsätzlich frei.",
        recommendation:
          "Inaktive oder noch nicht vollständig konfigurierte Anbieter deaktiviert lassen.",
      },
    ],
  },

  pricing: {
    title: "Preise & SynCredits richtig einstellen",
    intro:
      "Hier legen Sie fest, was Kunden für Analysen bezahlen und welche SynCredit-Pakete angeboten werden.",
    important:
      "Der Kundenpreis sollte nicht nur attraktiv aussehen, sondern auch reale API-Kosten, gewünschte Marge und zukünftige Schwankungen berücksichtigen.",
    items: [
      {
        label: "Analysepreis",
        text: "Anzahl der SynCredits, die bei Ausführung einer Analyse berechnet werden.",
        recommendation:
          "Mit den realen Kosten unter API-Kosten & Wirtschaftlichkeit vergleichen.",
      },
      {
        label: "SynCredit-Paket",
        text: "Kaufbares Guthabenpaket für Kunden.",
      },
      {
        label: "Bonus-Credits",
        text: "Zusätzlich gewährtes Guthaben, das der Kunde nicht direkt bezahlt.",
        warning: "Hohe Boni reduzieren effektiv den Erlös je SynCredit.",
      },
      {
        label: "Beliebt",
        text: "Marketing-Markierung für ein hervorgehobenes Paket.",
        recommendation:
          "Am besten das Paket markieren, das für Kunde und SynSight wirtschaftlich sinnvoll ist.",
      },
      {
        label: "Aktiv",
        text: "Nur aktive Analysen bzw. Pakete sind für Kunden verfügbar.",
      },
      {
        label: "Sortierung",
        text: "Beeinflusst hauptsächlich die Reihenfolge der Darstellung und nicht den Preis selbst.",
      },
    ],
  },

  "order-pricing": {
    title: "Auftragspreise verstehen",
    intro:
      "Diese Preise gelten für manuell oder durch SynSight bearbeitete Kundenaufträge wie Löschungen, DSGVO-Anfragen oder Google-Entfernungen.",
    important:
      "Auftragspreise sollten nicht wie reine API-Analysen kalkuliert werden. Zeitaufwand, manuelle Prüfung und mögliche Kommunikation müssen berücksichtigt werden.",
    items: [
      {
        label: "SynCredits",
        text: "Preis, den der Kunde für den jeweiligen Auftrag bezahlt.",
      },
      {
        label: "Vollmacht erforderlich",
        text: "Der Auftrag benötigt vor Bearbeitung eine entsprechende Kundenvollmacht.",
        recommendation:
          "Für externe Anfragen im Namen des Kunden aktivieren, wenn dies rechtlich oder organisatorisch erforderlich ist.",
      },
      {
        label: "SynSight kann bearbeiten",
        text: "Kennzeichnet, dass dieser Auftragstyp durch den SynSight-Workflow übernommen werden kann.",
      },
      {
        label: "Für Kunden buchbar",
        text: "Steuert, ob Kunden diesen Auftrag derzeit bestellen können.",
        recommendation:
          "Noch nicht vollständig vorbereitete Arbeitsabläufe deaktiviert lassen.",
      },
    ],
  },

  promotions: {
    title: "Promotionen kontrolliert einsetzen",
    intro:
      "Promotionen vergeben zeitlich oder mengenmäßig begrenzte Bonus-SynCredits und eignen sich für Registrierungsaktionen, Gutscheincodes und Kundenreaktivierung.",
    important:
      "Bonus-SynCredits sind wirtschaftlich nicht kostenlos. Werden damit kostenpflichtige Analysen ausgeführt, entstehen echte API-Kosten.",
    items: [
      {
        label: "Bonus-SynCredits",
        text: "Guthaben, das ein teilnehmender Nutzer durch die Aktion erhält.",
        recommendation: "So niedrig wie möglich und so hoch wie nötig wählen.",
      },
      {
        label: "Laufzeit",
        text: "Zeitraum, in dem die Promotion grundsätzlich gültig ist.",
      },
      {
        label: "Uhrzeit",
        text: "Optionales tägliches Zeitfenster innerhalb der Laufzeit.",
      },
      {
        label: "Promo-Code",
        text: "Wenn erforderlich, bekommt nur ein Nutzer mit dem passenden Code die Aktion.",
        recommendation:
          "Für gezielte Kampagnen oder externe Werbeaktionen verwenden.",
      },
      {
        label: "Neue / bestehende Nutzer",
        text: "Bestimmt, welche Nutzergruppe an der Promotion teilnehmen kann.",
      },
      {
        label: "Einmal pro Nutzer",
        text: "Verhindert eine mehrfache Inanspruchnahme durch denselben Account.",
        recommendation:
          "Bei klassischen Bonusaktionen normalerweise aktiviert lassen.",
      },
      {
        label: "Max. Teilnehmer",
        text: "Begrenzt die Anzahl der Nutzer, die den Bonus erhalten können.",
        recommendation:
          "Hilfreich, um das maximale Kostenrisiko einer Aktion zu kontrollieren.",
      },
      {
        label: "Mindestguthaben",
        text: "Zusätzliche Teilnahmebedingung auf Basis des vorhandenen SynCredit-Guthabens.",
      },
      {
        label: "Credit-Budget",
        text: "Maximale Gesamtmenge an SynCredits, die durch die Promotion ausgegeben werden darf.",
        recommendation: "Bei größeren Aktionen immer ein Budget setzen.",
      },
    ],
  },
};

export default function AdminFinanceGuide({ mode }: { mode: GuideMode }) {
  const guide = GUIDES[mode];

  return (
    <section className="rounded-[1.2rem] border border-cyber-cyan/15 bg-cyber-cyan/[0.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-4xl">
          <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/55">
            HILFE · EINORDNUNG · EMPFEHLUNGEN
          </p>
          <h3 className="mt-2 text-base font-semibold text-white/85">
            {guide.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            {guide.intro}
          </p>
        </div>
      </div>

      {guide.important ? (
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-4 py-3">
          <p className="font-mono text-[8px] tracking-[.12em] text-amber-100/60">
            WICHTIG
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-50/60">
            {guide.important}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {guide.items.map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
          >
            <p className="font-mono text-[9px] tracking-[.1em] text-cyber-cyan/60">
              {item.label.toUpperCase()}
            </p>

            <p className="mt-2 text-xs leading-relaxed text-white/50">
              {item.text}
            </p>

            {item.recommendation ? (
              <p className="mt-3 border-l-2 border-emerald-300/25 pl-3 text-[11px] leading-relaxed text-emerald-100/60">
                <strong className="font-medium text-emerald-100/75">
                  Empfehlung:
                </strong>{" "}
                {item.recommendation}
              </p>
            ) : null}

            {item.warning ? (
              <p className="mt-3 border-l-2 border-amber-300/30 pl-3 text-[11px] leading-relaxed text-amber-100/60">
                <strong className="font-medium text-amber-100/75">
                  Achtung:
                </strong>{" "}
                {item.warning}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
