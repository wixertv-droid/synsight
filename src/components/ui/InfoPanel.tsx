interface InfoPanelProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}

export default function InfoPanel({
  title,
  description,
  actionLabel,
  actionHref,
  compact = false,
}: InfoPanelProps) {
  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-white/[0.02] text-left ${
        compact ? "p-3" : "p-5 text-center"
      }`}
    >
      {!compact ? (
        <p className="font-mono text-[8px] tracking-[.14em] text-cyber-cyan/45">
          NOCH KEINE DATEN
        </p>
      ) : null}
      <p
        className={`font-medium text-white/70 ${compact ? "text-xs" : "mt-3 text-sm"}`}
      >
        {title}
      </p>
      <p
        className={`leading-relaxed text-white/35 ${
          compact
            ? "mt-1 text-[10px] line-clamp-4"
            : "mx-auto mt-2 max-w-md text-xs"
        }`}
      >
        {description}
      </p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="mt-4 inline-flex rounded-lg border border-cyber-blue/20 bg-cyber-blue/[0.06] px-3 py-2 text-[10px] text-cyan-100/80 transition hover:border-cyber-blue/35"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
