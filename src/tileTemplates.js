// Har tile ek FUNCTION hai — yeh purane element se nikala hua data (image, title, price)
// leta hai aur usi data ko naye design ke andar fit karke HTML deta hai.
// Matlab: naya LOOK, purana CONTENT.

export const ecommerceTiles = [
  {
    id: "product-card",
    name: "Product Card",
    preview: "🛍️",
    render: (data) => `
      <div style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;width:220px;font-family:sans-serif;">
        <div style="height:160px;background:#f4f4f5;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${data.image ? `<img src="${data.image}" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="color:#a1a1aa;font-size:13px;">No image</span>`}
        </div>
        <div style="padding:12px;">
          <p style="margin:0 0 4px;font-weight:600;font-size:14px;">${data.title || "Product Name"}</p>
          <p style="margin:0 0 10px;color:#71717a;font-size:13px;">${data.price || ""}</p>
          <button style="width:100%;padding:8px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">Add to Cart</button>
        </div>
      </div>`,
  },
  {
    id: "banner",
    name: "Promo Banner",
    preview: "🏷️",
    render: (data) => `
      <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:10px;padding:28px;width:400px;font-family:sans-serif;color:#fff;text-align:center;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;">${data.title || "Special Offer"}</p>
        <p style="margin:0 0 14px;font-size:13px;opacity:0.9;">${data.price || "Limited time deal"}</p>
        <button style="padding:8px 20px;background:#fff;color:#6366f1;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Shop Now</button>
      </div>`,
  },
  {
    id: "category-grid",
    name: "Category Grid",
    preview: "🔲",
    render: (data) => `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:360px;font-family:sans-serif;">
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#52525b;">${data.title || "Category"}</div>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#52525b;">More</div>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#52525b;">More</div>
      </div>`,
  },
  {
    id: "testimonial",
    name: "Testimonial",
    preview: "💬",
    render: (data) => `
      <div style="border:1px solid #e4e4e7;border-radius:10px;padding:18px;width:300px;font-family:sans-serif;">
        <p style="margin:0 0 10px;font-size:13px;color:#3f3f46;font-style:italic;">"${data.title || "Great product!"}"</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:#18181b;">— ${data.price || "Customer"}</p>
      </div>`,
  },
  {
    id: "cta",
    name: "CTA Button",
    preview: "🔘",
    render: (data) => `
      <button style="padding:12px 28px;background:#18181b;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:sans-serif;">
        ${data.title || "Buy Now"} →
      </button>`,
  },
];

export const blogTiles = [
  {
    id: "blog-card",
    name: "Blog Card",
    preview: "📝",
    render: (data) => `
      <div style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;width:260px;font-family:sans-serif;">
        <div style="height:140px;background:#f4f4f5;overflow:hidden;">
          ${data.image ? `<img src="${data.image}" style="width:100%;height:100%;object-fit:cover;" />` : ""}
        </div>
        <div style="padding:14px;">
          <p style="margin:0 0 6px;font-weight:600;font-size:15px;">${data.title || "Blog Post Title"}</p>
          <p style="margin:0;color:#71717a;font-size:12px;">${data.price || "5 min read"}</p>
        </div>
      </div>`,
  },
  {
    id: "quote-block",
    name: "Quote Block",
    preview: "❝",
    render: (data) => `
      <div style="border-left:3px solid #6366f1;padding:10px 16px;width:300px;font-family:sans-serif;">
        <p style="margin:0;font-size:14px;color:#3f3f46;font-style:italic;">${data.title || "An inspiring quote goes here."}</p>
      </div>`,
  },
];

export const portfolioTiles = [
  {
    id: "project-card",
    name: "Project Card",
    preview: "💼",
    render: (data) => `
      <div style="border-radius:10px;overflow:hidden;width:260px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
        <div style="height:150px;background:#18181b;overflow:hidden;">
          ${data.image ? `<img src="${data.image}" style="width:100%;height:100%;object-fit:cover;" />` : ""}
        </div>
        <div style="padding:14px;background:#fff;">
          <p style="margin:0 0 4px;font-weight:600;font-size:14px;">${data.title || "Project Name"}</p>
          <p style="margin:0;color:#71717a;font-size:12px;">${data.price || "View Project →"}</p>
        </div>
      </div>`,
  },
  {
    id: "skill-badge",
    name: "Skill Badge",
    preview: "🏅",
    render: (data) => `
      <span style="display:inline-block;padding:6px 14px;background:#eef2ff;color:#6366f1;border-radius:20px;font-size:12px;font-weight:600;font-family:sans-serif;">
        ${data.title || "React"}
      </span>`,
  },
];

export const landingTiles = [
  {
    id: "hero-headline",
    name: "Hero Headline",
    preview: "🚀",
    render: (data) => `
      <div style="text-align:center;padding:30px;font-family:sans-serif;">
        <p style="margin:0 0 10px;font-size:28px;font-weight:800;color:#18181b;">${data.title || "Build something amazing"}</p>
        <p style="margin:0;font-size:14px;color:#71717a;">${data.price || "The best way to start your next project"}</p>
      </div>`,
  },
  {
    id: "feature-card",
    name: "Feature Card",
    preview: "✨",
    render: (data) => `
      <div style="padding:18px;border:1px solid #e4e4e7;border-radius:10px;width:220px;font-family:sans-serif;text-align:center;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:600;">${data.title || "Feature Name"}</p>
        <p style="margin:0;font-size:12px;color:#71717a;">${data.price || "Short description here"}</p>
      </div>`,
  },
];

// Yeh sabse NEECHE honi chahiye — kyunki yeh upar ki saari lists ko use karti hai
export const tileCategories = {
  "E-commerce": ecommerceTiles,
  "Blog": blogTiles,
  "Portfolio": portfolioTiles,
  "Landing Page": landingTiles,
};

// Target element se asli data (image, title, price) nikalne wala helper
export function extractContent(el) {
  const img = el.querySelector("img");
  const image = img ? img.src : "";

  const texts = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const t = node.textContent.trim();
    if (t) texts.push(t);
  }

  const priceRegex = /[\u20b9$]\s?\d|^\d+(\.\d+)?$/;
  const price = texts.find((t) => priceRegex.test(t)) || "";
  const title = texts.find((t) => t !== price) || texts[0] || "";

  return { image, title, price };
}
