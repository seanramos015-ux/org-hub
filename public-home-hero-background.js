// ==========================================
// ORGHUB - PUBLIC HOMEPAGE HERO BACKGROUND
// Loads a random photo from the public "site-assets" storage bucket and
// uses it as the homepage hero background.
//
// Where it looks (in order, first source that has images wins):
//   1. bucket "site-assets"  -> files in the root and in any sub-folder
//                               except "logo" (the logo upload folder)
//   2. bucket "orghub-public" -> folder "site-assets/"
// ==========================================

(async function loadHomepageHeroBackground() {
  const SOURCES = [
    { bucket: "site-assets",   folder: "",            skipFolders: ["logo"] },
    { bucket: "orghub-public", folder: "site-assets", skipFolders: ["logo"] }
  ];
  const IMAGE_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;

  const hero = document.querySelector("#view-home .hero");
  if (!hero || typeof supabaseClient === "undefined") {
    console.warn("[hero-bg] Homepage hero or Supabase client was not found.");
    return;
  }

  function isImage(entry) {
    const name = entry.name || "";
    const type = entry.metadata && entry.metadata.mimetype;
    return name && !name.startsWith(".") &&
      (IMAGE_PATTERN.test(name) || (type && type.startsWith("image/")));
  }

  // In a storage listing, folders come back with id === null.
  function isFolder(entry) {
    return entry.id === null || (entry.id === undefined && !entry.metadata);
  }

  async function listFolder(bucket, folder) {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });

    if (error) {
      console.error(`[hero-bg] Could not list "${bucket}/${folder}":`, error.message);
      return [];
    }
    return data || [];
  }

  // Returns [{ bucket, path }] for every image found in one source.
  async function findImages(source) {
    const results = [];
    const join = (folder, name) => (folder ? folder + "/" + name : name);

    const top = await listFolder(source.bucket, source.folder);

    for (const entry of top) {
      if (isFolder(entry)) {
        if (!entry.name || source.skipFolders.includes(entry.name)) continue;

        const subFolder = join(source.folder, entry.name);
        const inside = await listFolder(source.bucket, subFolder);
        inside.filter(item => !isFolder(item) && isImage(item)).forEach(item => {
          results.push({ bucket: source.bucket, path: join(subFolder, item.name) });
        });
      } else if (isImage(entry)) {
        results.push({ bucket: source.bucket, path: join(source.folder, entry.name) });
      }
    }

    return results;
  }

  try {
    let images = [];

    for (const source of SOURCES) {
      images = await findImages(source);
      if (images.length) break;
      console.warn(`[hero-bg] No images found in "${source.bucket}/${source.folder}".`);
    }

    if (!images.length) {
      console.warn(
        "[hero-bg] No hero background images were found. If the files exist, the bucket " +
        "probably needs a public SELECT policy on storage.objects so the site can list it " +
        "(see supabase-site-assets-policy.sql)."
      );
      return;
    }

    const selected = images[Math.floor(Math.random() * images.length)];
    const { data: publicData } = supabaseClient.storage
      .from(selected.bucket)
      .getPublicUrl(selected.path);
    const imageUrl = publicData && publicData.publicUrl;

    if (!imageUrl) throw new Error("Supabase did not return a public image URL.");

    // Make sure the file really loads before painting it (catches wrong paths,
    // private buckets and blocked requests, and tells you why in the console).
    await new Promise((resolve, reject) => {
      const probe = new Image();
      probe.onload = resolve;
      probe.onerror = () => reject(new Error("Image URL did not load: " + imageUrl));
      probe.src = imageUrl;
    });

    // Photo plus a soft white wash so the hero text stays readable.
    hero.style.setProperty(
      "background-image",
      'linear-gradient(rgba(255,255,255,.48),rgba(255,255,255,.48)),url("' +
        imageUrl.replace(/(["\\])/g, "\\$1") + '")',
      "important"
    );
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
    hero.style.backgroundRepeat = "no-repeat";

    console.info("[hero-bg] Homepage hero background loaded:", selected.bucket + "/" + selected.path);
  } catch (error) {
    console.error("[hero-bg] Homepage hero background loading error:", error);
  }
})();