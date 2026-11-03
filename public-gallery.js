
const galleryGrid = document.getElementById("gallery-grid");
const galleryCount = document.getElementById("gallery-count");

function showGalleryMessage(message, isError = false) {
  galleryGrid.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  paragraph.style.color = isError ? "red" : "var(--ink-soft)";
  paragraph.style.gridColumn = "1 / -1";

  galleryGrid.appendChild(paragraph);
}

function getGalleryImageUrl(imagePath) {
  if (!imagePath) return "";

  // Support existing records containing a complete URL.
  if (imagePath.startsWith("https://")) {
    return imagePath;
  }

  const { data } = supabaseClient.storage
    .from("orghub-public")
    .getPublicUrl(imagePath);

  return data.publicUrl;
}

function createPublicGalleryCard(item, eventTitles) {
  const card = document.createElement("article");
  card.className = "public-gallery-card";

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "public-gallery-image-wrapper";

  const image = document.createElement("img");
  image.className = "public-gallery-image";
  image.src = getGalleryImageUrl(item.image_path);
  image.alt = item.title || "OrgHub event photo";
  image.loading = "lazy";

  image.addEventListener("error", () => {
    imageWrapper.replaceChildren();

    const errorText = document.createElement("p");
    errorText.textContent = "Image unavailable";
    errorText.className = "gallery-image-error";

    imageWrapper.appendChild(errorText);
  });

  imageWrapper.appendChild(image);

  const content = document.createElement("div");
  content.className = "public-gallery-content";

  const title = document.createElement("h3");
  title.textContent = item.title || "Untitled photo";

  content.appendChild(title);

  if (item.event_id) {
    const eventLabel = document.createElement("p");
    eventLabel.className = "public-gallery-event";
    eventLabel.textContent =
      eventTitles.get(item.event_id) || "Related event";

    content.appendChild(eventLabel);
  }

  if (item.caption) {
    const caption = document.createElement("p");
    caption.className = "public-gallery-caption";
    caption.textContent = item.caption;

    content.appendChild(caption);
  }

  card.append(imageWrapper, content);

  return card;
}

async function loadPublicGallery() {
  if (!galleryGrid) return;

  if (typeof supabaseClient === "undefined") {
    showGalleryMessage(
      "Unable to connect to the gallery right now.",
      true
    );
    return;
  }

  showGalleryMessage("Loading gallery images...");

  const { data: galleryItems, error } = await supabaseClient
    .from("gallery")
    .select("id, event_id, title, image_path, caption, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gallery loading error:", error);

    showGalleryMessage(
      "Unable to load gallery images. Please try again later.",
      true
    );

    return;
  }

  if (!galleryItems || galleryItems.length === 0) {
    galleryCount.textContent = "0 photos";

    showGalleryMessage(
      "No published gallery photos are available yet."
    );

    return;
  }

  // Retrieve event names for gallery entries linked to published events.
  const { data: events, error: eventError } = await supabaseClient
    .from("events")
    .select("id, title")
    .eq("is_published", true);

  if (eventError) {
    console.warn("Unable to retrieve event titles:", eventError);
  }

  const eventTitles = new Map(
    (events || []).map(event => [event.id, event.title])
  );

  galleryGrid.replaceChildren();

  let displayedCount = 0;

  galleryItems.forEach(item => {
    if (!item.image_path) return;

    const card = createPublicGalleryCard(item, eventTitles);
    galleryGrid.appendChild(card);
    displayedCount++;
  });

  galleryCount.textContent =
    `${displayedCount} ${displayedCount === 1 ? "photo" : "photos"}`;

  if (displayedCount === 0) {
    showGalleryMessage(
      "No valid gallery images are currently available."
    );
  }
}

// Load gallery after the page is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPublicGallery);
} else {
  loadPublicGallery();
}
