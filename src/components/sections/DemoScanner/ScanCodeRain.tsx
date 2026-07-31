"use client";

/**
 * Long scrolling cyber-code stream for the DemoScanner analysis HUD.
 * Full-bleed background atmosphere — long lines, not short blocks.
 */
const STREAM_LINES = [
  "GET https://api.osint.mesh/v3/identity/resolve?q=subject&mode=public_index&ttl=active HTTP/1.1",
  "dns.resolve(mx) → MX=10 mail.provider.net · SPF=pass · DMARC=quarantine · age=2014",
  "SIG.MATCH confidence=0.714 · vector=name+geo · channel=serp.hybrid · safe=off",
  "crawl::social → linkedin.com/in/* · x.com/* · github.com/* · nodes=48 · edges=61",
  "OSINT.CHANNEL.OPEN · google+bing · parallel=4 · budget_ms=45000 · page_cap=2",
  "NODE.LINK.verify(entity_id=0xA91F) · alias_cluster=3 · contact_hit=true",
  "scan.email.norm → lowercase · plus-strip · domain_intel · breach.lookup queued",
  "GRAPH.edge+=12 · relationship=employer|location|alias · dedupe.hash=ok",
  "serp.query.flush priority=3 exact_name · serpapi.hybrid · results=28 · retained=9",
  "entity.resolve · fingerprint=sha256:7c12… · matrix.score=0.62 · emit.finding",
  "TRACE::FOOTPRINT public.mention · geo.signal.low · queue.depth=12 · filter.noise",
  "breach.lookup dehashed · identifiers.unmask=false · exposure_count+=2",
  "corr.engine.run threat_matrix · phishing=0.41 · credential_stuffing=0.33",
  "SYN|SIGHT.CORE packet.inspect · timeline.merge · brief.render · done.pass",
  "WHOIS.open registrar=… · created=2011-08-14 · nameservers=cloudflare · status=ok",
  "img.meta.read exif.strip · reverse_candidate=0 · discovery_only=true",
  "confidence>0.60 keep · confidence<0.50 drop · retention=unlimited · write.brief",
  "PHASE 3 · recon_matrix · max=15 · google+bing · STATUS=RUNNING · t=2.8s",
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
