// ==========================================
// ORGHUB - PUBLIC FOOTER
// Random published gallery photo from the orghub-public storage bucket.
// ==========================================

// ==========================================
// ORGHUB - PUBLIC FOOTER
// Random image from the public storage bucket's hero/ folder.
// ==========================================

(async function loadPublicFooter() {
  const footer = document.getElementById("site-footer");
  const year = document.getElementById("footer-year");
  if (year) year.textContent = new Date().getFullYear();
  if (!footer || typeof supabaseClient === "undefined") return;

  try {
    const bucket = supabaseClient.storage.from("orghub-public");
    const { data: files, error } = await bucket.list("hero", {
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
      console.warn("No images found in orghub-public/hero.");
      return;
    }

    const selected = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const { data: publicData } = bucket.getPublicUrl("hero/" + selected.name);
    const imageUrl = publicData && publicData.publicUrl;

    const background = footer.querySelector(".footer-background");
    if (background && imageUrl) {
      background.style.backgroundImage =
        'linear-gradient(115deg,rgba(191,75,0,.78),rgba(255,126,25,.58)),url("' +
        imageUrl.replace(/(["\\])/g, "\\$1") + '")';
    }
  } catch (error) {
    console.error("Footer hero-folder image error:", error);
  }
})();
