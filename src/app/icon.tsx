import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            width: 360,
            height: 360,
            borderRadius: 999,
            border: "8px solid #29B6F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#70E7FF",
            fontSize: 160,
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
