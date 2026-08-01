"use client";

const STREAM_LINES = [
  "PIPELINE.sequential · holehe → maigret → phoneinfoga → harvester → photon → spiderfoot",
  "HOLEHE.scan email --only-used · account.matrix · emit[+]",
  "MAIGRET.username · profile.url · confidence=0.75 · sites.sweep",
  "PHONEINFOGA.scan -n +49… · carrier|geo|line_type",
  "THEHARVESTER -d domain · emails[] hosts[] · sources=public",
  "PHOTON -u https://… -l 2 --keys · crawl.depth",
  "SPIDERFOOT.startscan · usecase=passive · poll.events · stor_db",
  "STEP.timeout=75s · nginx.safe · no.parallel.burst",
  "AUTH.bearer · contabo.deep · module=one · /api/scan",
  "FINDING.group by source · modular.brief · exposure_score",
  "SYN|SIGHT.CORE · arc.gauge · progress.per.module · dossier.render",
  "PHASE · sequential OSINT · STATUS=RUNNING · real.results.only",
];

export default function ScanCodeRain() {
  return (
    <div
      className="scan-code-rain pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
    >
      <div className="scan-code-track absolute inset-x-0 top-0 font-mono text-[11px] leading-[1.85] tracking-[0.04em] text-emerald-300/25 md:text-[12px]">
        {[0, 1].map((copy) => (
          <div key={copy} className="px-4 py-6 md:px-10">
            {STREAM_LINES.map((line, index) => (
              <div
                key={`${copy}-${index}`}
                className="whitespace-nowrap opacity-90"
                style={{ opacity: 0.35 + ((index * 17) % 40) / 100 }}
              >
                {`> ${line}`}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
