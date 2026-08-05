import { ImageResponse } from "next/og";

export const alt = "SynSight — Digitale Identität erkennen und schützen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #03050a 0%, #071525 55%, #0a1f33 100%)",
          padding: 64,
          color: "#e8edf5",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            letterSpacing: "0.22em",
            color: "#70E7FF",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              border: "1px solid rgba(41,182,246,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            S
          </div>
          <span style={{ display: "flex" }}>SYNSIGHT</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.12,
            }}
          >
            <span style={{ display: "flex" }}>Digitale Identitaet</span>
            <span style={{ display: "flex" }}>erkennen und schuetzen</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "rgba(232,237,245,0.65)",
              maxWidth: 900,
            }}
          >
            Cybersecurity- und OSINT-Plattform fuer oeffentliche Profile,
            Datenlecks und digitale Spuren.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#29B6F6",
            letterSpacing: "0.08em",
          }}
        >
          synsight.de
        </div>
      </div>
    ),
    { ...size }
  );
}
