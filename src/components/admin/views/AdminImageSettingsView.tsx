"use client";

export default function AdminImageSettingsView() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        ["Maximale Dateigröße", "12 MB"],
        ["Kompressionsqualität", "82"],
        ["WebP Qualität", "80"],
        ["Thumbnail Qualität", "72"],
        ["Maximale Auflösung", "2048 px"],
        ["Original verschlüsseln", "Ja"],
        ["Analysebilder erzeugen", "Ja"],
      ].map(([label, value]) => (
        <article
          key={label}
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
        >
          <p className="font-mono text-[8px] text-white/30">{label}</p>
          <p className="mt-2 text-lg text-white/75">{value}</p>
          <p className="mt-1 text-[10px] text-white/30">
            platform_settings — bearbeitbar in nächster Iteration
          </p>
        </article>
      ))}
    </div>
  );
}
