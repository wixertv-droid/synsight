"use client";

/**
 * Subtle scrolling cyber-code atmosphere for the hero.
 * Decorative only — suggests an internet/OSINT search stream
 * without competing with the globe or headline.
 */
const COLUMNS = [
  {
    delay: "0s",
    duration: "28s",
    left: "4%",
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
    delay: "-7s",
    duration: "34s",
    left: "18%",
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
    delay: "-13s",
    duration: "31s",
    left: "72%",
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
    duration: "36s",
    left: "88%",
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
];

export default function HeroCodeRain() {
  return (
    <div
      className="hero-code-rain pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {COLUMNS.map((column) => (
        <div
          key={column.left}
          className="hero-code-column absolute top-0 w-[9.5rem] font-mono text-[9px] leading-[1.7] tracking-[0.08em] text-cyber-cyan/[0.14]"
          style={{
            left: column.left,
            animationDuration: column.duration,
            animationDelay: column.delay,
          }}
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="py-8">
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
