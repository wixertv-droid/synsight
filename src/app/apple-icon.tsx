import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#03050A",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 999,
            border: "4px solid #29B6F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#70E7FF",
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size }
  );
}
