import { ImageResponse } from "next/og";

export const alt = "RiskOps Lab";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(circle at top right, rgba(225,87,71,0.28), transparent 32%), linear-gradient(135deg, #0f1f2e 0%, #173a46 58%, #1d5a63 100%)",
          color: "#f6f3ee",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.04em",
          }}
        >
          <span>RiskOps Lab</span>
          <span style={{ color: "#E15747" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "820px" }}>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: "-0.06em",
            }}
          >
            Build AML and fraud investigation skills before your first role.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              color: "rgba(246,243,238,0.88)",
              maxWidth: "760px",
            }}
          >
            Synthetic cases, guided workflows, and review-oriented practice for beginner analysts.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 22,
            color: "rgba(246,243,238,0.82)",
          }}
        >
          <span>riskopslab.com</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>Fraud & AML Investigation Simulator</span>
        </div>
      </div>
    ),
    size
  );
}
