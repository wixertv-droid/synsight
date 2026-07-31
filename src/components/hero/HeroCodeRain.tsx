"use client";

/**
 * Subtle scrolling cyber-code atmosphere for the hero.
 * Sits above the dark atmosphere overlay so it stays visible,
 * stronger on the right (globe side), softer on the left (headline).
 */
const COLUMNS = [
  {
    delay: "0s",
    duration: "26s",
    left: "6%",
    opacity: "0.18",
    lines: [
      "GET /public/index",
      "dns.resolve(mx)",
      "SIG.MATCH 0.71",
      "crawl::social",
      "TTL=ACTIVE",
      "hash.verify()",
      "WHOIS.open",
      "leak.probe()",
    ],
  },
  {
    delay: "-6s",
    duration: "32s",
    left: "22%",
    opacity: "0.22",
    lines: [
      "OSINT.CHANNEL.OPEN",
      "NODE.LINK.verify",
      "scan.email.norm",
      "GRAPH.edge+=1",
      "serp.query.flush",
      "entity.resolve",
      "risk.score.tick",
      "cache.miss",
    ],
  },
  {
    delay: "-12s",
    duration: "29s",
    left: "58%",
    opacity: "0.32",
    lines: [
      "TRACE::FOOTPRINT",
      "profile.surface",
      "alias.cluster",
      "img.meta.read",
      "breach.lookup",
      "corr.engine.run",
      "confidence>0.6",
      "emit.finding",
    ],
  },
  {
    delay: "-3s",
    duration: "34s",
    left: "74%",
    opacity: "0.36",
    lines: [
      "SYN|SIGHT.CORE",
      "packet.inspect",
      "public.mention",
      "geo.signal.low",
      "queue.depth=12",
      "filter.noise",
      "write.brief",
      "done.pass",
    ],
  },
  {
    delay: "-9s",
    duration: "30s",
    left: "90%",
    opacity: "0.28",
    lines: [
      "recon.vector[3]",
      "bing.hybrid.safe",
      "google.index.hit",
      "dedupe.hash",
      "matrix.score",
      "threat.eval",
      "timeline.merge",
      "brief.render",
    ],
  },
];

export default function HeroCodeRain() {
  return (
    <div
      className="hero-code-rain pointer-events-none absolute inset-0 z-[2] overflow-hidden"
      aria-hidden="true"
      style={{
        maskImage:
          "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 28%, black 55%, black 100%)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 28%, black 55%, black 100%)",
      }}
    >
      {COLUMNS.map((column) => (
        <div
          key={column.left}
          className="hero-code-column absolute top-0 w-[10.5rem] font-mono text-[10px] leading-[1.75] tracking-[0.1em] text-cyber-cyan"
          style={{
            left: column.left,
            opacity: column.opacity,
            animationDuration: column.duration,
            animationDelay: column.delay,
          }}
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="py-10">
              {column.lines.map((line) => (
                <div key={`${copy}-${line}`} className="whitespace-nowrap">
                  {`> ${line}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
