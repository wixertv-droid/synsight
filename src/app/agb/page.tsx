import LegalPage from "@/components/layout/LegalPage";

export const metadata = { title: "Nutzungsbedingungen — SynSight" };

export default function TermsPage() {
  return (
    <LegalPage title="Nutzungsbedingungen" label="Vorläufige Fassung">
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Demo-Status</h2>
        <p>
          Die aktuelle Website demonstriert das geplante Nutzungserlebnis von
          SynSight. Scanner-Ergebnisse und Risikowerte sind beispielhaft und
          stellen keine reale Sicherheitsanalyse oder verbindliche Beratung
          dar.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Produktanfragen
        </h2>
        <p>
          Eine Anfrage zum Schutzpaket führt noch nicht zu einem Vertrag. Preise
          und Leistungsumfang werden vor einer Buchung transparent bestätigt.
        </p>
      </section>
      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-amber-100/60">
        Vollständige Vertragsbedingungen werden vor dem öffentlichen
        Produktstart bereitgestellt und rechtlich geprüft.
      </p>
    </LegalPage>
  );
}
