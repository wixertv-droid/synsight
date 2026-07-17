interface InfoPanelProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function InfoPanel({
  title,
  description,
  actionLabel,
  actionHref,
}: InfoPanelProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
      <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
        NOCH KEINE DATEN
      </p>
      <p className="mt-3 text-sm font-medium text-white/70">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/35">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="mt-4 inline-flex rounded-lg border border-cyber-blue/20 bg-cyber-blue/[0.06] px-4 py-2 text-xs text-cyan-100/80 transition hover:border-cyber-blue/35"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
