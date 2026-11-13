// ==========================================
// ORGHUB - PUBLIC HOMEPAGE HERO BACKGROUND
// Loads a random image from the public site-assets folder.
// ==========================================

(async function loadHomepageHeroBackground() {
  const hero = document.querySelector("#view-home .hero");
  if (!hero || typeof supabaseClient === "undefined") {
    console.warn("Homepage hero or Supabase client was not found.");
    return;
  }

  try {
    const bucket = supabaseClient.storage.from("orghub-public");
    const { data: files, error } = await bucket.list("site-assets", {
      limit: 100,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) throw error;

    const imageFiles = (files || []).filter(file => {
      const name = file.name || "";
      const contentType = file.metadata && file.metadata.mimetype;
      return name &&
        !name.startsWith(".") &&
        (/\.(avif|gif|jpe?g|png|webp)$/i.test(name) ||
          (contentType && contentType.startsWith("image/")));
    });

    if (!imageFiles.length) {
      console.warn("No image files found in orghub-public/site-assets.", files);
      return;
    }

    const selected = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const objectPath = "site-assets/" + selected.name;
    const { data: publicData } = bucket.getPublicUrl(objectPath);
    const imageUrl = publicData && publicData.publicUrl;

    if (!imageUrl) throw new Error("Supabase did not return a public image URL.");

    // Apply the photo and a soft white wash together so the image remains
    // visible while the hero text stays readable.
    hero.style.setProperty(
      "background-image",
      'linear-gradient(rgba(255,255,255,.48),rgba(255,255,255,.48)),url("' +
        imageUrl.replace(/(["\\])/g, "\\$1") + '")',
      "important"
    );
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
    hero.style.backgroundRepeat = "no-repeat";

    console.info("Homepage hero background loaded:", objectPath);
  } catch (error) {
    console.error("Homepage hero background loading error:", error);
  }
})();
