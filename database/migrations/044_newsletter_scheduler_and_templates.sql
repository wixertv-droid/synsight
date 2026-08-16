-- Newsletter Scheduler defaults + refined SynSight system templates

UPDATE `newsletter_settings`
SET `worker_interval_seconds` = 10
WHERE `id` = 1
  AND `worker_interval_seconds` = 60;

UPDATE `newsletter_templates`
SET
  `description` = 'SynSight Command-Center Newsletter für allgemeine Produkt- und Plattformneuigkeiten.',
  `content_json` = '{"version":2,"theme":"standard","blocks":[{"id":"std-head","type":"heading","text":"Dein digitaler Schutz im Blick"},{"id":"std-text-1","type":"text","text":"SynSight entwickelt sich weiter. Hier findest du die wichtigsten Neuigkeiten rund um deine digitale Identität und deinen Schutz im Internet."},{"id":"std-divider","type":"divider"},{"id":"std-text-2","type":"text","text":"Öffne dein Command Center und prüfe, was sich bei deinem digitalen Fußabdruck verändert hat."},{"id":"std-button","type":"button","text":"SynSight öffnen","url":"https://synsight.de/dashboard"}]}'
WHERE `id` = 1;

UPDATE `newsletter_templates`
SET
  `description` = 'Neue Analysen, Funktionen und Verbesserungen im SynSight Command Center.',
  `content_json` = '{"version":2,"theme":"product","blocks":[{"id":"product-head","type":"heading","text":"Neue Funktionen im SynSight Command Center"},{"id":"product-text","type":"text","text":"Wir haben SynSight erweitert. Neue Funktionen helfen dir dabei, öffentlich sichtbare Informationen schneller zu erkennen, einzuordnen und zu kontrollieren."},{"id":"product-divider","type":"divider"},{"id":"product-button","type":"button","text":"Neue Funktionen ansehen","url":"https://synsight.de/changelog"}]}'
WHERE `id` = 2;

UPDATE `newsletter_templates`
SET
  `description` = 'Dringende Sicherheitsinformationen mit klarer Handlungsempfehlung.',
  `content_json` = '{"version":2,"theme":"security","blocks":[{"id":"security-head","type":"heading","text":"Sicherheitslage: Das solltest du jetzt prüfen"},{"id":"security-text","type":"text","text":"Es gibt ein Sicherheitsthema, das für deine digitale Identität relevant sein kann. Prüfe deine aktuellen SynSight-Ergebnisse und achte besonders auf neue oder unerwartete Funde."},{"id":"security-divider","type":"divider"},{"id":"security-button","type":"button","text":"Sicherheitsstatus prüfen","url":"https://synsight.de/dashboard/threats"}]}'
WHERE `id` = 3;

UPDATE `newsletter_templates`
SET
  `description` = 'SynCredits, Aktionen und zeitlich begrenzte SynSight-Angebote.',
  `content_json` = '{"version":2,"theme":"promotion","blocks":[{"id":"promo-head","type":"heading","text":"Mehr SynCredits. Mehr Schutz."},{"id":"promo-text","type":"text","text":"Für kurze Zeit wartet eine besondere SynSight-Aktion auf dich. Nutze zusätzliche SynCredits für Analysen deiner digitalen Identität."},{"id":"promo-divider","type":"divider"},{"id":"promo-button","type":"button","text":"Aktion entdecken","url":"https://synsight.de/dashboard"}]}'
WHERE `id` = 4;

UPDATE `newsletter_templates`
SET
  `description` = 'Redaktioneller Newsletter für OSINT, digitale Identität und SynSight-Wissensinhalte.',
  `content_json` = '{"version":2,"theme":"content","blocks":[{"id":"content-head","type":"heading","text":"Was das Internet über dich verrät"},{"id":"content-text","type":"text","text":"Neue Einblicke aus der Welt der digitalen Identität, OSINT und Internetsicherheit. Verständlich erklärt und direkt auf deinen digitalen Alltag übertragbar."},{"id":"content-divider","type":"divider"},{"id":"content-button","type":"button","text":"SynSight Wissen öffnen","url":"https://synsight.de/wissen"}]}'
WHERE `id` = 5;
