// ==========================================
// ORGHUB - PUBLIC HERO PHOTOS
// Loads published hero (banner) photos from Supabase and hands them to the
// carousel in index.html (setHeroPhotos). If nothing is published or the
// request fails, the fallback photo list in index.html stays in place.
// ==========================================

(async function loadPublicHeroPhotos() {
    if (typeof supabaseClient === "undefined" || typeof setHeroPhotos !== "function") {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("hero_photos")
            .select("image_path, caption, sort_order, created_at")
            .eq("is_published", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (error || !data || data.length === 0) {
            if (error) console.error("Hero photos error:", error);
            return;
        }

        const photos = data
            .map(item => {
                let src = item.image_path || "";

                if (src && !src.startsWith("https://")) {
                    src = supabaseClient.storage
                        .from("orghub-public")
                        .getPublicUrl(src).data.publicUrl;
                }

                return { src, caption: item.caption || "" };
            })
            .filter(photo => photo.src);

        setHeroPhotos(photos);
    } catch (error) {
        console.error("Hero photos loading error:", error);
    }
})();
