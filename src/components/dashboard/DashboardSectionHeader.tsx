import InfoTooltip from "@/components/ui/InfoTooltip";

interface DashboardSectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  helpLabel: string;
  helpText: string;
}

export default function DashboardSectionHeader({
  eyebrow,
  title,
  description,
  helpLabel,
  helpText,
}: DashboardSectionHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="hud-label">{eyebrow}</span>
        <h1 className="mt-4 flex flex-wrap items-center text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">
          {title}
          <InfoTooltip label={helpLabel}>{helpText}</InfoTooltip>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/32">{description}</p>
      </div>
      <p className="font-mono text-[8px] tracking-[.14em] text-amber-100/40">
        UI PREVIEW · KEINE LIVE-PIPELINE
      </p>
    </header>
  );
}
