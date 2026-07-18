/** Ambient hologram glow — rings + soft core. */
export default function BiometricGlow() {
  return (
    <g className="bio-glow" aria-hidden="true">
      <ellipse className="bio-glow-core" cx="100" cy="108" rx="62" ry="74" />
      <ellipse className="bio-glow-ring" cx="100" cy="108" rx="78" ry="92" />
      <ellipse
        className="bio-glow-ring"
        cx="100"
        cy="108"
        rx="68"
        ry="82"
        style={{ animationDelay: "0.4s", opacity: 0.22 }}
      />
    </g>
  );
}
