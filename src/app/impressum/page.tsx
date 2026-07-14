import LegalPage from "@/components/layout/LegalPage";

export const metadata = { title: "Impressum — SynSight" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" label="Rechtliche Angaben">
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Anbieter</h2>
        <p>
          SynSight ist derzeit ein Produktprojekt in Vorbereitung. Die
          vollständigen Anbieter- und Registerangaben werden vor dem
          öffentlichen Produktstart ergänzt.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Kontakt</h2>
        <p>
          E-Mail:{" "}
          <a className="text-cyber-blue" href="mailto:hello@synsight.de">
            hello@synsight.de
          </a>
        </p>
      </section>
      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-amber-100/60">
        Hinweis: Diese vorläufige Projektseite ersetzt kein vollständiges
        Impressum. Vor einer öffentlichen geschäftlichen Nutzung müssen die
        gesetzlich erforderlichen Angaben ergänzt werden.
      </p>
    </LegalPage>
  );
}
