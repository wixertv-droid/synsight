"use client";

/**
 * Long scrolling cyber-code stream for the DemoScanner analysis HUD.
 * Full-bleed background atmosphere — long lines, not short blocks.
 */
const STREAM_LINES = [
  "HOLEHE.scan email --only-used · account.matrix · emit[+]",
  "MAIGRET.username --sites · profile.url · confidence=0.75",
  "PHONEINFOGA.scan -n +49… · carrier|geo|line_type",
  "THEHARVESTER -d domain -b all · emails[] hosts[]",
  "PHOTON -u https://… -l 3 --keys · crawl.depth",
  "SPIDERFOOT.startscan · modules=email,accounts,breach,dns · usecase=all",
  "MODULE.QUEUE parallel · filled_fields_only · empty=skip",
  "AUTH.bearer · contabo.deep · /api/scan · timeout=320s",
  "FINDING.group by source · holehe|maigret|phoneinfoga|harvester|photon|sf",
  "CORR.engine · exposure_score · risk_level · modular.brief",
  "SYN|SIGHT.CORE packet.inspect · timeline.merge · dossier.render",
  "scanstatus · RUNNING→FINISHED · result_count · cache.write",
  "ENTITY.resolve · alias_cluster · contact_hit · graph+=",
  "PHASE · multi-module OSINT · STATUS=RUNNING · real.results.only",
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
