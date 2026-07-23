export default function AdminPlaceholderPanel({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <section className="hardware-panel rounded-[1.2rem] border border-dashed border-white/[0.1] bg-white/[0.015] p-6 md:p-8">
      <p className="font-mono text-[9px] tracking-[.16em] text-cyber-cyan/45">
        SOC MODULE / PREVIEW
      </p>
      <h2 className="mt-3 text-lg font-medium text-white/80">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
        {note}
      </p>
    </section>
  );
}
