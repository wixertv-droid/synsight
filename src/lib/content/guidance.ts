/**
 * Central user-facing guidance copy for Sprint 6E explainability.
 * Keep wording friendly and non-technical; explain jargon inline.
 */

export const guidance = {
  landing: {
    hero: "SynSight hilft Ihnen zu verstehen, welche Informationen über Sie öffentlich im Internet auffindbar sind – und was Sie dagegen tun können.",
    platform:
      "Die Plattform fasst gefundene Signale zu einem verständlichen Bild zusammen und zeigt Ihnen die wichtigsten nächsten Schritte.",
    demoScanner:
      "Der Risiko-Check ist eine unverbindliche Vorschau. Er zeigt, welche Art von Ergebnissen SynSight liefern kann – ohne Registrierung.",
    digitalTraces:
      "Digitale Spuren sind Informationen, die im Internet über eine Person entstehen können. Dazu gehören öffentliche Profile, alte Konten, Bilder, Webseiten oder Erwähnungen.",
    dataLeaks:
      "Ein Datenleck entsteht, wenn persönliche Informationen durch Sicherheitsprobleme öffentlich werden. SynSight hilft dabei, mögliche Risiken zu erkennen.",
    aiAnalysis:
      "Unsere KI unterstützt dabei, große Mengen digitaler Informationen schneller zu analysieren und verständlich aufzubereiten.",
    reverseImage:
      "Mit einer Bildanalyse können mögliche öffentliche Verwendungen eines Bildes erkannt werden.",
    syncredits:
      "SynCredits sind die interne Nutzungseinheit von SynSight. Jede Analyse benötigt – abhängig vom Umfang – eine bestimmte Anzahl an SynCredits.",
    trust:
      "SynSight arbeitet transparent: Sie sehen, welche Informationen geprüft werden und wie Ergebnisse zustande kommen.",
  },
  dashboard: {
    securityStatus:
      "Der Sicherheitsstatus zeigt eine zusammengefasste Einschätzung Ihrer digitalen Sichtbarkeit. Er basiert auf gefundenen Informationen und möglichen Risiken.",
    digitalTraces:
      "Hier sehen Sie Informationen, die öffentlich mit Ihrer digitalen Identität verbunden sein können.",
    riskAnalysis:
      "Die Risikoanalyse zeigt Bereiche, in denen möglicherweise Handlungsbedarf besteht.",
    protectionStatus:
      "Der Schutzstatus zeigt Empfehlungen, mit denen Sie Ihre digitale Sicherheit verbessern können.",
    analysisCenter:
      "Im Analysezentrum werden öffentliche Signale miteinander verknüpft, damit Sie Zusammenhänge schneller erkennen können.",
    syncredits:
      "SynCredits sind die interne Nutzungseinheit von SynSight. Jede Analyse benötigt abhängig vom Umfang eine bestimmte Anzahl an SynCredits.",
    recommendations:
      "Empfehlungen werden nach Dringlichkeit sortiert, damit Sie zuerst die wichtigsten Schritte sehen.",
    demoData:
      "Die Kennzahlen auf dieser Seite sind derzeit Beispieldaten zur Produktvorschau. Ihre echten Ergebnisse erscheinen nach einer Analyse.",
  },
  auth: {
    email:
      "Wir benötigen Ihre E-Mail-Adresse für die Anmeldung und zur Bestätigung Ihres Kontos.",
    password:
      "Wählen Sie ein starkes Passwort mit mindestens 8 Zeichen. Es wird sicher verschlüsselt gespeichert.",
    firstName: "Ihr Vorname hilft SynSight, Sie persönlich anzusprechen.",
    lastName:
      "Ihr Nachname kann bei der Zuordnung öffentlicher Informationen helfen.",
  },
  profile: {
    personalData:
      "Diese Informationen helfen SynSight dabei, Ihre digitale Identität genauer zu erkennen.",
    aliases:
      "Aliase sind Namen oder Spitznamen, die Sie im Internet verwenden.",
    phone:
      "Eine Telefonnummer kann helfen, öffentliche Verbindungen oder mögliche Datenlecks zu erkennen.",
    images:
      "Die Bilder helfen später bei der Suche nach möglichen öffentlichen Bildverwendungen. Ihre Bilder werden geschützt gespeichert und automatisch für die Analyse optimiert.",
    social:
      "Durch die Angabe öffentlicher Profile kann SynSight besser erkennen, welche Informationen online mit Ihrer Identität verbunden sind.",
  },
  admin: {
    users:
      "Verwalten Sie Benutzerkonten, prüfen Sie Guthaben und passen Sie SynCredits bei Bedarf an.",
    pricing:
      "Hier werden die Kosten einzelner Analysen und SynCredit-Pakete verwaltet.",
    promotions:
      "Hier können Marketingaktionen erstellt werden, bei denen Benutzer automatisch SynCredits erhalten können.",
  },
  analysis: {
    what: "Diese Analyse prüft öffentlich zugängliche Informationen, die mit Ihrer digitalen Identität in Verbindung stehen könnten.",
    why: "So erkennen Sie frühzeitig, welche Informationen über Sie sichtbar sind und wo Handlungsbedarf bestehen könnte.",
    cost: "Vor jeder Analyse sehen Sie den Preis in SynCredits, Ihr aktuelles Guthaben und das Restguthaben danach.",
    result:
      "Sie erhalten eine verständliche Zusammenfassung mit den wichtigsten Funden und Empfehlungen.",
  },
  empty: {
    transactions:
      "Es wurden noch keine Abbuchungen gefunden. Laden Sie SynCredits auf oder starten Sie eine Analyse, um Ihre digitale Sichtbarkeit zu prüfen.",
    promotions:
      "Es sind noch keine Promotionen angelegt. Erstellen Sie eine Aktion, um Benutzern automatisch SynCredits gutzuschreiben.",
    users:
      "Keine passenden Benutzer gefunden. Passen Sie Ihre Suche an oder prüfen Sie die Schreibweise.",
    analysisResults:
      "Es wurden noch keine Analyseergebnisse gefunden. Starten Sie eine Analyse, um Ihre digitale Sichtbarkeit zu prüfen.",
  },
} as const;

export const analysisGuidance: Record<
  string,
  { what: string; why: string; result: string }
> = {
  person_search: {
    what: "Diese Analyse durchsucht öffentliche Informationen nach möglichen Verbindungen zu Ihrer digitalen Identität.",
    why: "So finden Sie heraus, welche Spuren Ihr Name oder Ihre Angaben im Internet hinterlassen haben könnten.",
    result:
      "Sie erhalten eine übersichtliche Liste relevanter Funde mit Risikohinweisen.",
  },
  reverse_image_search: {
    what: "Mit einer Bildanalyse können mögliche öffentliche Verwendungen eines Bildes erkannt werden.",
    why: "Fotos können ohne Ihr Wissen auf anderen Webseiten oder Profilen erscheinen.",
    result:
      "Sie sehen, wo ähnliche Bilder gefunden wurden und wie Sie reagieren können.",
  },
  google_search: {
    what: "Diese Analyse prüft, welche öffentlichen Suchergebnisse zu Ihnen passen könnten.",
    why: "Viele Menschen finden über Suchmaschinen schnell persönliche Informationen – auch über Sie.",
    result: "Sie erhalten die wichtigsten Treffer in verständlicher Form.",
  },
  default: {
    what: "Diese Analyse prüft öffentlich zugängliche Informationen zu Ihrer digitalen Identität.",
    why: "So erkennen Sie frühzeitig, welche Informationen sichtbar sind.",
    result: "Sie erhalten eine verständliche Zusammenfassung mit Empfehlungen.",
  },
};

export function getAnalysisGuidance(analysisKey: string) {
  return analysisGuidance[analysisKey] ?? analysisGuidance.default;
}
