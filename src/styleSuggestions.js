// "Replace It" — selected element ke liye 8 varied style-suggestions.
// Naam/text wahi rehta hai, sirf LOOK badalta hai.

export function detectAccentColor() {
  const candidates = document.querySelectorAll("button, a, [class*='btn'], [class*='button']");
  const counts = {};
  candidates.forEach((el) => {
    if (el.closest(".edit-tool-ui")) return;
    const bg = window.getComputedStyle(el).backgroundColor;
    if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return;
    counts[bg] = (counts[bg] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return rgbToHex(sorted.length ? sorted[0][0] : "rgb(99, 102, 241)");
}

function rgbToHex(rgb) {
  const match = rgb.match(/\d+/g);
  if (!match) return "#6366f1";
  return "#" + match.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, "0")).join("");
}

function isButtonLike(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === "button" || tag === "a") return true;
  const cls = (el.className || "").toString().toLowerCase();
  if (cls.includes("btn") || cls.includes("button")) return true;
  return window.getComputedStyle(el).cursor === "pointer";
}

export function getVariantsFor(el) {
  const accent = detectAccentColor();

  if (isButtonLike(el)) {
    return [
      { id: "attractive", label: "Attractive", style: { background: `linear-gradient(90deg, ${accent}, #ec4899)`, color: "#fff", padding: "12px 26px", border: "none", borderRadius: "30px", fontWeight: "700", boxShadow: "0 6px 16px rgba(0,0,0,0.2)", fontSize: "14px" } },
      { id: "simple", label: "Simple", style: { background: "transparent", color: accent, padding: "10px 20px", border: `2px solid ${accent}`, borderRadius: "6px", fontWeight: "600", boxShadow: "none", fontSize: "14px" } },
      { id: "professional", label: "Professional", style: { background: "#18181b", color: "#fff", padding: "11px 24px", border: "none", borderRadius: "4px", fontWeight: "600", boxShadow: "none", fontSize: "13px", letterSpacing: "0.5px" } },
      { id: "matching", label: "Matches Your Site", style: { background: accent, color: "#fff", padding: "10px 22px", border: "none", borderRadius: "8px", fontWeight: "600", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", fontSize: "14px" } },
      { id: "glass", label: "Glassmorphism", style: { background: `${accent}33`, color: accent, padding: "11px 24px", border: `1px solid ${accent}55`, borderRadius: "14px", fontWeight: "600", boxShadow: "0 4px 18px rgba(0,0,0,0.1)", fontSize: "14px", backdropFilter: "blur(6px)" } },
      { id: "neumorphic", label: "Soft 3D", style: { background: "#f0f0f3", color: "#3f3f46", padding: "12px 24px", border: "none", borderRadius: "12px", fontWeight: "600", boxShadow: "6px 6px 12px #d1d1d4, -6px -6px 12px #ffffff", fontSize: "14px" } },
      { id: "outline-pill", label: "Outline Pill", style: { background: "#fff", color: accent, padding: "10px 24px", border: `1.5px solid ${accent}`, borderRadius: "999px", fontWeight: "600", boxShadow: "none", fontSize: "13px" } },
      { id: "bold-flat", label: "Bold Flat", style: { background: "#f59e0b", color: "#18181b", padding: "12px 28px", border: "none", borderRadius: "2px", fontWeight: "800", boxShadow: "4px 4px 0px #18181b", fontSize: "14px" } },
    ];
  }

  return [
    { id: "attractive", label: "Attractive", style: { background: "#f5f3ff", border: `1px solid ${accent}`, borderRadius: "10px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" } },
    { id: "simple", label: "Simple", style: { background: "transparent", border: "1px solid #e4e4e7", borderRadius: "4px", boxShadow: "none" } },
    { id: "professional", label: "Professional", style: { background: "#fff", border: `1px solid ${accent}`, borderRadius: "6px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } },
    { id: "matching", label: "Matches Your Site", style: { background: accent, border: "none", borderRadius: "8px", boxShadow: "none" } },
    { id: "glass", label: "Glassmorphism", style: { background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: "14px", boxShadow: "0 4px 18px rgba(0,0,0,0.1)" } },
    { id: "soft3d", label: "Soft 3D", style: { background: "#f0f0f3", border: "none", borderRadius: "12px", boxShadow: "6px 6px 12px #d1d1d4, -6px -6px 12px #ffffff" } },
    { id: "bordered", label: "Bold Border", style: { background: "#fff", border: `3px solid ${accent}`, borderRadius: "6px", boxShadow: "none" } },
    { id: "shadowed", label: "Elevated", style: { background: "#fff", border: "none", borderRadius: "10px", boxShadow: "0 12px 28px rgba(0,0,0,0.15)" } },
  ];
}

export function applyVariant(el, variant) {
  Object.assign(el.style, variant.style);
}
