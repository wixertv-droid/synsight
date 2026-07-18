/** Orbiting scanner rings around the biometric subject. */
export default function BiometricScanner() {
  return (
    <g className="bio-scanner" aria-hidden="true">
      <ellipse className="bio-scanner-ring" cx="100" cy="108" rx="84" ry="98" />
      <ellipse
        className="bio-scanner-ring bio-scanner-ring-inner"
        cx="100"
        cy="108"
        rx="72"
        ry="86"
      />
      <circle cx="100" cy="108" r="2" fill="var(--bio-accent)" opacity="0.5" />
    </g>
  );
}
