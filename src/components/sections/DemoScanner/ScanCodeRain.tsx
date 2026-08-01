"use client";

/**
 * Long scrolling cyber-code stream for the DemoScanner analysis HUD.
 * Full-bleed background atmosphere — long lines, not short blocks.
 */
const STREAM_LINES = [
  "SPIDERFOOT.startscan · usecase=passive · target=EMAILADDR · stor_db=on",
  "dns.resolve(mx) → MX=10 mail.provider.net · SPF=pass · DMARC=quarantine",
  "sfp_email · EMAILADDR correlated · module=passive · emit.event",
  "crawl::social → public profiles · nodes+= · edges+= · filter.noise",
  "OSINT.CHANNEL.OPEN · spiderfoot.passive · wait_s=18 · poll=1.5s",
  "NODE.LINK.verify(entity_id) · alias_cluster · contact_hit",
  "scan.email.norm → lowercase · domain_intel · eventtypes.flush",
  "GRAPH.edge+= · relationship=employer|location|alias · dedupe.hash=ok",
  "scaneventresults · id=scan · rows+= · type.classify · map.findings",
  "entity.resolve · fingerprint · matrix.score · emit.finding",
  "TRACE::FOOTPRINT public.mention · geo.signal · queue.depth",
  "sfp_accounts · ACCOUNT_EXTERNAL · exposure_count+=",
  "corr.engine.run threat_matrix · correlation.HIGH|MEDIUM|LOW|INFO",
  "SYN|SIGHT.CORE packet.inspect · timeline.merge · brief.render · done.pass",
  "WHOIS.open · INTERNET_NAME · nameservers · status=ok",
  "scanstatus · RUNNING→FINISHED · result_count · cache.write",
  "confidence>0.60 keep · confidence<0.50 drop · source=spiderfoot",
  "PHASE · passive footprint · STATUS=RUNNING · real.events.only",
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
