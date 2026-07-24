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

/** Sprint 6C — Enterprise OSINT Fachbegriffe (Info-Buttons) */
export const osintGuidance = {
  osint:
    "OSINT (Open Source Intelligence) bedeutet die Auswertung öffentlich zugänglicher Quellen — Suchmaschinen, Profile, Foren, Dokumente und Register. SynSight erfindet keine privaten Daten.",
  confidence:
    "Confidence misst, wie gut ein Treffer zu Ihrer Identitätsmatrix passt. 90–100 % = Bestätigt, 70–89 % = Hohe Übereinstimmung, 50–69 % = Möglicher Treffer. Unter 50 % wird nicht angezeigt.",
  identityMatch:
    "Identity Match prüft Vorname, Nachname, Alias, Benutzername, Telefon, E-Mail, Firma, Wohnort und Domain gegen Titel, Snippet und URL des Treffers.",
  leak: "Ein Leak / Datenleck liegt vor, wenn Identifikatoren (z. B. E-Mail oder Telefon) in bekannten Breach-Datenbanken auftauchen. DeHashed-Treffer gelten als verifiziert.",
  entity:
    "Eine Entity ist ein erkanntes Identitätsmerkmal oder ein verknüpftes Online-Objekt (Person, Profil, Domain, Handle), das mit Ihrer Fingerprint-Matrix korreliert wird.",
  exposure:
    "Exposure beschreibt, welche persönlichen Daten öffentlich auffindbar sind — z. B. Telefonnummer, E-Mail oder Anschrift in indexierten Quellen.",
  threat:
    "Threat bewertet belegte Risiken aus den gefundenen Quellen (Leak, Social Engineering, Impersonation, Reputation). Nur nachweisbare Signale zählen.",
  risk: "Risk fasst die Gesamteinschätzung aus Trefferzahl, Confidence und Threat-Matrix zusammen. Mittel/Hoch bedeutet priorisierte Prüfung, nicht automatische Schuld.",
} as const;

/** Sprint 6D — Digital Leak Fachbegriffe */
export const leakGuidance = {
  credentialStuffing:
    "Credential Stuffing nutzt geleakte Benutzername/Passwort-Kombinationen automatisiert an anderen Diensten. Einzigartige Passwörter und 2FA reduzieren das Risiko stark.",
  passwordHash:
    "Ein Passwort-Hash ist eine Einweg-Transformation des Passworts. Auch ohne Klartext kann ein Hash offline angegriffen werden — Passwortwechsel bleibt Pflicht.",
  exposure:
    "Exposure beschreibt, welche Identitätsmerkmale in bekannten Leak-Quellen auftauchen (E-Mail, Telefon, Alias, Hash-Hinweise usw.).",
  leak: "Ein Leak / Breach ist eine bestätigte Datenquelle, in der Identifikatoren aus Sicherheitsvorfällen auftauchen. SynSight zeigt nur DeHashed-Metadaten, keine Passwortwerte.",
  collection:
    "Eine Collection ist eine zusammengestellte Leak-Sammlung. Mehrere Collections können dieselben Identifikatoren mehrfach enthalten.",
  threatLevel:
    "Threat Level fasst die belegte Bedrohungslage aus Leak-Anzahl, Passwort-Hinweisen und Identitätsmerkmalen zusammen (LOW / MEDIUM / HIGH).",
  confidence:
    "Confidence gibt an, wie sicher ein Leak-Treffer dem geprüften Identifikator zugeordnet ist. DeHashed-Treffer gelten als hoch verifiziert.",
  identityExposure:
    "Identity Exposure (0–100) misst, wie stark persönliche Merkmale in Leaks exponiert sind — unabhängig von einer moralischen Bewertung.",
} as const;

export const analysisGuidance: Record<
  string,
  { what: string; why: string; result: string }
> = {
  google_search: {
    what: "Prüft, welche öffentlichen Suchergebnisse zu Ihnen passen könnten.",
    why: "Viele Menschen finden über Suchmaschinen schnell persönliche Informationen – auch über Sie.",
    result: "Die wichtigsten Treffer in verständlicher Form.",
  },
  digital_leak_exposure: {
    what: "Prüft hinterlegte E-Mail-Adressen und Telefonnummern auf bekannte Datenlecks.",
    why: "Kompromittierte Identifikatoren sind ein häufiges Einfallstor für Account-Übernahmen.",
    result:
      "Exposure-Report mit Risiko-Score und konkreten Schutzempfehlungen.",
  },
  phone_analysis: {
    what: "Prüft, ob Ihre Telefonnummer in öffentlichen Quellen auffindbar ist.",
    why: "Sichtbare Nummern erleichtern Spam, Betrug und unerwünschte Kontakte.",
    result: "Treffer plus Tipps, wie Sie die Sichtbarkeit reduzieren.",
  },
  email_analysis: {
    what: "Prüft öffentliche Sichtbarkeit und mögliche Leak-Hinweise zu Ihrer E-Mail.",
    why: "E-Mails sind oft der Schlüssel zu weiteren Konten und Identitätsdiebstahl.",
    result: "Expositionshinweise und konkrete Schutzmaßnahmen.",
  },
  website_analysis: {
    what: "Sucht öffentliche Webseiten und Impressen mit Bezug zu Ihrer Identität.",
    why: "Alte Projekt- oder Firmenseiten können Kontaktdaten unnötig offenlegen.",
    result: "Gefundene Seiten mit priorisierten Prüfpunkten.",
  },
  domain_analysis: {
    what: "Untersucht öffentlich erkennbare Risiken und Zuordnungen Ihrer Domains.",
    why: "Domains können Eigentümer- und Kontaktspuren sichtbar machen.",
    result: "Domain-Exposition und Schutzempfehlungen.",
  },
  alias_analysis: {
    what: "Prüft Benutzernamen und Spitznamen auf öffentliche Verknüpfungen.",
    why: "Alte Nicknames verbinden oft Profile, die Sie längst vergessen haben.",
    result: "Erkannte Aliase und Hinweise auf alte Konten.",
  },
  social_media: {
    what: "Prüft öffentliche Social-Media-Profile und sichtbare Verbindungen.",
    why: "Bios, Fotos und Links sind oft ohne Login für jeden sichtbar.",
    result: "Profilhinweise und Privatsphäre-Empfehlungen.",
  },
  person_search: {
    what: "Durchsucht öffentliche Informationen nach Verbindungen zu Ihrer Identität.",
    why: "So finden Sie heraus, welche Spuren Ihr Name online hinterlassen hat.",
    result: "Übersichtliche Fundliste mit Risikohinweisen.",
  },
  reverse_image_search: {
    what: "Erkennt mögliche öffentliche Verwendungen Ihrer Bilder.",
    why: "Fotos können ohne Ihr Wissen auf anderen Seiten oder Profilen erscheinen.",
    result: "Bildtreffer und Handlungsempfehlungen.",
  },
  ai_summary: {
    what: "Fasst Analyseergebnisse in verständlicher Sprache zusammen.",
    why: "Sie müssen keine Rohdaten lesen — die KI priorisiert das Wichtige.",
    result: "Kurzbericht mit Top-Risiken und nächsten Schritten.",
  },
  pdf_report: {
    what: "Erstellt einen exportierbaren PDF-Bericht Ihrer Ergebnisse.",
    why: "Praktisch für Unterlagen, Beratung oder interne Dokumentation.",
    result: "PDF mit Zusammenfassung und Empfehlungen.",
  },
  deep_intelligence: {
    what: "Verknüpft mehrere Quellen zu einer tiefen Identitätsbewertung.",
    why: "Einzelne Treffer allein zeigen selten das volle Risiko.",
    result: "Korrelierte Funde und priorisierte Schutzmaßnahmen.",
  },
  full_identity_analysis: {
    what: "Führt die wichtigsten Prüfungen zu einem Gesamtbild Ihrer digitalen Sichtbarkeit zusammen.",
    why: "Ideal, wenn Sie unsicher sind, welche Einzelanalyse zuerst sinnvoll ist.",
    result: "Komplettüberblick mit klarem Maßnahmenplan.",
  },
  default: {
    what: "Prüft öffentlich zugängliche Informationen zu Ihrer digitalen Identität.",
    why: "So erkennen Sie frühzeitig, welche Informationen sichtbar sind.",
    result: "Verständliche Zusammenfassung mit Empfehlungen.",
  },
};

export function getAnalysisGuidance(analysisKey: string) {
  return analysisGuidance[analysisKey] ?? analysisGuidance.default;
}
