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
        {/* Teal accent bar at top */}
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

        {/* Logo text */}
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

        {/* Headline */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "900px",
            marginBottom: "20px",
          }}
        >
          NDIS SDA Compliance &amp; Property Management
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: "24px",
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
            marginBottom: "40px",
          }}
        >
          One platform. Every SDA property. Audit-ready from day one.
        </div>

        {/* Feature badges */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          {["Evidence Vault", "Compliance Watchdog", "Xero Invoicing"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "rgba(13, 148, 136, 0.15)",
                  border: "1px solid rgba(13, 148, 136, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 20px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#14b8a6",
                  }}
                />
                <span
                  style={{
                    fontSize: "18px",
                    color: "#14b8a6",
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </span>
              </div>
            )
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            display: "flex",
            alignItems: "center",
            gap: "24px",
            color: "#6b7280",
            fontSize: "16px",
          }}
        >
          <span>mysdamanager.com</span>
          <span>|</span>
          <span>NDIS-Compliant Data Protection</span>
          <span>|</span>
          <span>AES-256 Encrypted</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
