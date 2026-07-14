const particles = [
  [8, 18, 0],
  [16, 72, 2],
  [24, 38, 4],
  [34, 84, 1],
  [43, 16, 5],
  [52, 58, 3],
  [61, 29, 1],
  [70, 78, 4],
  [78, 43, 2],
  [88, 20, 5],
  [92, 67, 0],
] as const;

export default function PlatformBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(41,182,246,.09),transparent_28rem),radial-gradient(circle_at_15%_90%,rgba(20,89,128,.07),transparent_32rem),linear-gradient(135deg,#020408,#050a13_55%,#020408)]" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_82%)]" />
      <svg viewBox="0 0 1200 800" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-25">
        <g fill="none" stroke="rgba(112,231,255,.16)" strokeWidth=".7">
          <path className="platform-data-path" d="M-80 610C180 530 210 230 480 350S780 720 1280 390" />
          <path className="platform-data-path" d="M-50 210C250 330 390 90 620 250S910 510 1260 170" style={{ animationDelay: "-3s" }} />
          <path d="M310 0V800M720 0V800M0 290H1200M0 610H1200" opacity=".13" />
        </g>
        <g fill="#70E7FF">
          <circle cx="310" cy="316" r="2" opacity=".55" />
          <circle cx="620" cy="250" r="2" opacity=".45" />
          <circle cx="720" cy="580" r="2" opacity=".5" />
          <circle cx="980" cy="292" r="2" opacity=".4" />
        </g>
      </svg>
      {particles.map(([left, top, delay], index) => (
        <span
          key={index}
          className="platform-particle absolute h-1 w-1 rounded-full bg-cyan-100/40"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `-${delay}s`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/25 to-transparent" />
    </div>
  );
}
