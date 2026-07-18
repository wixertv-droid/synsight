/** Horizontal biometric scan sweep (shown on hover / analyzing). */
export default function ScannerLine() {
  return (
    <g className="bio-scan-line-group" aria-hidden="true">
      <line
        className="bio-scan-line"
        x1="38"
        y1="108"
        x2="162"
        y2="108"
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="bio-scan-line"
        x1="48"
        y1="108"
        x2="152"
        y2="108"
        style={{ opacity: 0.35, strokeWidth: 3 }}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
