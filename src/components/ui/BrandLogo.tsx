import Link from "next/link";

interface BrandLogoProps {
  compact?: boolean;
  href?: string;
}

export default function BrandLogo({
  compact = false,
  href = "/",
}: BrandLogoProps) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 group">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.025] transition-colors group-hover:border-cyber-blue/35">
        <span className="absolute inset-1.5 rounded-full border border-cyber-blue/15" />
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="#29B6F6" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.6" fill="#70E7FF" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#70E7FF" strokeWidth=".7" opacity=".45" />
        </svg>
      </span>
      {!compact && (
        <span>
          <span className="block text-[13px] font-semibold tracking-[.23em] text-white/90">
            SYN<span className="text-cyber-blue">SIGHT</span>
          </span>
          <span className="mt-1 block font-mono text-[7px] tracking-[.16em] text-white/25">
            IDENTITY INTELLIGENCE
          </span>
        </span>
      )}
    </Link>
  );
}
