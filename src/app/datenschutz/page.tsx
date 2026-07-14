import LegalPage from "@/components/layout/LegalPage";

export const metadata = { title: "Datenschutz — SynSight" };

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutz" label="Datenschutzinformation">
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Stand dieser Website
        </h2>
        <p>
          Die aktuelle SynSight-Website ist eine Produktpräsentation. Die
          dargestellte Analyse ist eine Simulation und fragt keine echten
          Identitäts- oder Leak-Daten ab.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Eingaben in der Demo
        </h2>
        <p>
          Eingaben in den Demo-Scanner werden ausschließlich lokal im Browser
          für die beispielhafte Darstellung verwendet und nicht an einen
          Analyse-Dienst übertragen.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Kontakt</h2>
        <p>
          Datenschutzanfragen richten Sie bitte an{" "}
          <a
            className="text-cyber-blue"
            href="mailto:datenschutz@synsight.de"
          >
            datenschutz@synsight.de
          </a>
          .
        </p>
      </section>
      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-amber-100/60">
        Vor dem Anschluss realer Analyse-, Zahlungs- oder Tracking-Dienste muss
        diese Information um alle tatsächlich eingesetzten Verarbeitungen
        ergänzt und rechtlich geprüft werden.
      </p>
    </LegalPage>
  );
}
