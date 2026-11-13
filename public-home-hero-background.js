// ==========================================
// ORGHUB - PUBLIC HOMEPAGE HERO BACKGROUND
// Loads a random image from orghub-public/site-assets.
// ==========================================

(async function loadHomepageHeroBackground() {
  const hero = document.querySelector("#view-home .hero");
  if (!hero || typeof supabaseClient === "undefined") return;

  try {
    const bucket = supabaseClient.storage.from("orghub-public");
    const { data: files, error } = await bucket.list("site-assets", {
      limit: 100,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) throw error;

    const imageFiles = (files || []).filter(file =>
      file.name &&
      !file.name.startsWith(".") &&
      /\.(avif|gif|jpe?g|png|webp)$/i.test(file.name)
    );

    if (!imageFiles.length) {
      console.warn("No images found in orghub-public/site-assets.");
      return;
    }

    const selected = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const { data: publicData } = bucket.getPublicUrl("site-assets/" + selected.name);
    const imageUrl = publicData && publicData.publicUrl;

    if (imageUrl) {
      hero.style.backgroundImage = 'url("' + imageUrl.replace(/(["\\])/g, "\\$1") + '")';
    }
  } catch (error) {
    console.error("Homepage hero background loading error:", error);
  }
})();
