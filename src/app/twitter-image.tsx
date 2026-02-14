import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MySDAManager — NDIS SDA Compliance & Property Management Software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#111827",
          padding: "60px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #0d9488, #14b8a6, #0d9488)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#0d9488",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            MySDAManager
          </span>
        </div>

        <div
          style={{
            fontSize: "44px",
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "860px",
            marginBottom: "20px",
          }}
        >
          Audit-ready from day one.
        </div>

        <div
          style={{
            fontSize: "22px",
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: "660px",
            lineHeight: 1.4,
          }}
        >
          Australia&apos;s only purpose-built SDA property management platform.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "30px",
            fontSize: "16px",
            color: "#6b7280",
          }}
        >
          mysdamanager.com
        </div>
      </div>
    ),
    { ...size }
  );
}
