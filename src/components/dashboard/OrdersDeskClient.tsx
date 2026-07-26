"use client";

const QUEUE_SECTIONS = [
  {
    id: "neu",
    title: "Neue Aufträge",
    hint: "Frisch eingegangene Übernahmen — noch nicht zugewiesen.",
  },
  {
    id: "offen",
    title: "Offene Aufträge",
    hint: "Warten auf Bearbeitung durch Worker oder Admin.",
  },
  {
    id: "bearbeitung",
    title: "In Bearbeitung",
    hint: "Aktive Fälle, die gerade bearbeitet werden.",
  },
  {
    id: "erledigt",
    title: "Erledigt / Archiv",
    hint: "Abgeschlossene Aufträge — Anbindung folgt.",
  },
] as const;

export default function OrdersDeskClient() {
  return (
    <main className="mx-auto max-w-5xl">
      <header className="mb-10">
        <p className="font-mono text-[8px] tracking-[.16em] text-amber-200/50">
          OPERATIONS / AUFTRÄGE
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-.02em] text-white/90">
          Auftragsübersicht
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/40">
          Übersicht für Admin und Worker über offene und neue Aufträge. Die
          Anbindung an das Auftragssystem folgt in einem späteren Schritt.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {QUEUE_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-white/85">
                  {section.title}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-white/35">
                  {section.hint}
                </p>
              </div>
              <span className="shrink-0 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[9px] tracking-[.12em] text-white/30">
                0
              </span>
            </div>
            <div className="mt-5 flex min-h-[88px] items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-black/20">
              <p className="font-mono text-[9px] tracking-[.14em] text-white/22">
                NOCH KEINE DATEN
              </p>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
