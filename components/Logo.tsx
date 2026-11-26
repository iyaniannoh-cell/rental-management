export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const pixelDimensions = size === "sm" ? 32 : size === "lg" ? 48 : 40;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {/* Locked icon container: HARDCODED PIXELS SO IT NEVER EXPANDS */}
      <div
        style={{
          width: `${pixelDimensions}px`,
          height: `${pixelDimensions}px`,
          minWidth: `${pixelDimensions}px`,
          minHeight: `${pixelDimensions}px`,
          maxWidth: `${pixelDimensions}px`,
          maxHeight: `${pixelDimensions}px`,
          borderRadius: "12px",
          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#020617"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V9.5z" />
          <path d="M10 13a2 2 0 1 0 4 0v4h-4v-4z" fill="#020617" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 900, fontSize: size === "sm" ? "18px" : "22px", color: "#ffffff", lineHeight: 1 }}>
          e<span style={{ color: "#34d399" }}>Boma</span>
        </span>
        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginTop: "3px" }}>
          Keja Yako • Rent Yako
        </span>
      </div>
    </div>
  );
}