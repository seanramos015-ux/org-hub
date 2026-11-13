// ==========================================
// ORGHUB - PUBLIC FOOTER
// Random published gallery photo from the orghub-public storage bucket.
// ==========================================

(async function loadPublicFooter() {
  const footer = document.getElementById("site-footer");
  const year = document.getElementById("footer-year");
  if (year) year.textContent = new Date().getFullYear();
  if (!footer || typeof supabaseClient === "undefined") return;

  try {
    const { data, error } = await supabaseClient
      .from("gallery")
      .select("image_path")
      .eq("is_published", true)
      .not("image_path", "is", null);

    if (error) throw error;
    const images = (data || []).filter(item => item.image_path);

    if (!images.length) return;

    const selected = images[Math.floor(Math.random() * images.length)];
    let imageUrl = selected.image_path;

    if (!/^https?:\/\//i.test(imageUrl)) {
      const { data: publicData } = supabaseClient.storage
        .from("orghub-public")
        .getPublicUrl(imageUrl);
      imageUrl = publicData.publicUrl;
    }

    const background = footer.querySelector(".footer-background");
    if (background && imageUrl) {
      const safeUrl = imageUrl.replace(/(["\\])/g, "\\$1");
      background.style.backgroundImage =
        'linear-gradient(115deg,rgba(191,75,0,.78),rgba(255,126,25,.58)),url("' + safeUrl + '")';
    }
  } catch (error) {
    console.error("Footer background image error:", error);
  }
})();
