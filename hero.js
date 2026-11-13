// ==========================================
// ORGHUB - ADMIN: HERO PHOTOS
// Manage the homepage banner photos (table: hero_photos,
// storage: public bucket "orghub-public", folder "hero/").
// ==========================================

const heroForm = document.getElementById("hero-form");
const captionInput = document.getElementById("hero-caption");
const imageInput = document.getElementById("hero-image");
const sortInput = document.getElementById("hero-sort");
const publishedInput = document.getElementById("hero-published");
const preview = document.getElementById("hero-preview");

const saveButton = document.getElementById("hero-save");
const cancelButton = document.getElementById("hero-cancel");
const formTitle = document.getElementById("hero-form-title");
const formMessage = document.getElementById("hero-form-message");
const listMessage = document.getElementById("hero-list-message");
const tableBody = document.getElementById("hero-table-body");

const HERO_BUCKET = "orghub-public";
const HERO_FOLDER = "hero";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

let editingId = null;
let currentImagePath = null;
let itemsCache = [];

function showFormMessage(message, error = false) {
  formMessage.textContent = message;
  formMessage.style.color = error ? "red" : "green";
}

function showListMessage(message, error = false) {
  listMessage.textContent = message;
  listMessage.style.color = error ? "red" : "green";
}

async function verifyHeroAdmin() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  if (error || !session) {
    window.location.href = "admin-login.html";
    return false;
  }

  const { data, error: adminError } = await supabaseClient.rpc("is_org_admin");

  if (adminError || data !== true) {
    await supabaseClient.auth.signOut();
    window.location.href = "admin-login.html";
    return false;
  }

  return true;
}

function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("https://")) return path;

  const { data } = supabaseClient.storage.from(HERO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function nextSortOrder() {
  if (!itemsCache.length) return 1;
  return Math.max(...itemsCache.map(item => item.sort_order || 0)) + 1;
}

function resetHeroForm() {
  heroForm.reset();
  editingId = null;
  currentImagePath = null;

  preview.src = "";
  preview.hidden = true;

  sortInput.value = nextSortOrder();
  formTitle.textContent = "Add Hero Photo";
  saveButton.textContent = "Save Photo";
  cancelButton.hidden = true;
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) {
    preview.src = "";
    preview.hidden = true;
    return;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    imageInput.value = "";
    preview.hidden = true;
    showFormMessage("Please select a JPG, PNG, or WebP image.", true);
    return;
  }

  if (file.size > MAX_FILE_BYTES) {
    imageInput.value = "";
    preview.hidden = true;
    showFormMessage("That image is larger than 5 MB. Please choose a smaller file.", true);
    return;
  }

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  showFormMessage("");
});

async function uploadHeroImage(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new Error("Unsupported image file type.");
  }

  const filePath = `${HERO_FOLDER}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from(HERO_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return filePath;
}

async function removeHeroImage(path) {
  if (!path || path.startsWith("https://")) return;

  const { error } = await supabaseClient.storage.from(HERO_BUCKET).remove([path]);

  if (error) {
    console.warn("Image storage cleanup failed:", error.message);
  }
}

async function loadHeroPhotos() {
  showListMessage("Loading hero photos...");

  const { data, error } = await supabaseClient
    .from("hero_photos")
    .select("id, image_path, caption, sort_order, is_published, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    showListMessage("Unable to load hero photos: " + error.message, true);
    return;
  }

  itemsCache = data || [];
  tableBody.replaceChildren();

  if (!editingId) sortInput.value = nextSortOrder();

  if (itemsCache.length === 0) {
    showListMessage("No hero photos have been added yet. The homepage will use its default photo.");
    return;
  }

  showListMessage("");

  itemsCache.forEach((item, index) => {
    const row = document.createElement("tr");

    // Order + move buttons
    const orderCell = document.createElement("td");
    const orderNumber = document.createElement("div");
    orderNumber.textContent = String(index + 1);

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.textContent = "↑";
    upButton.title = "Move up";
    upButton.className = "hero-action hero-move";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveHeroPhoto(index, -1));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.textContent = "↓";
    downButton.title = "Move down";
    downButton.className = "hero-action hero-move";
    downButton.disabled = index === itemsCache.length - 1;
    downButton.addEventListener("click", () => moveHeroPhoto(index, 1));

    orderCell.append(orderNumber, upButton, downButton);

    // Thumbnail
    const imageCell = document.createElement("td");
    const image = document.createElement("img");
    image.className = "hero-thumb";
    image.src = getImageUrl(item.image_path);
    image.alt = item.caption || "Hero photo";
    image.loading = "lazy";
    imageCell.appendChild(image);

    const captionCell = document.createElement("td");
    captionCell.textContent = item.caption || "—";

    const statusCell = document.createElement("td");
    statusCell.textContent = item.is_published ? "Published" : "Unpublished";

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "hero-action hero-edit";
    editButton.addEventListener("click", () => editHeroPhoto(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "hero-action hero-delete";
    deleteButton.addEventListener("click", () => deleteHeroPhoto(item));

    actionsCell.append(editButton, deleteButton);

    row.append(orderCell, imageCell, captionCell, statusCell, actionsCell);
    tableBody.appendChild(row);
  });
}

async function moveHeroPhoto(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= itemsCache.length) return;

  const reordered = [...itemsCache];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Renumber 1..n and only write the rows whose number changed.
  const changes = reordered
    .map((item, position) => ({ item, newOrder: position + 1 }))
    .filter(({ item, newOrder }) => item.sort_order !== newOrder);

  showListMessage("Updating order...");

  const results = await Promise.all(
    changes.map(({ item, newOrder }) =>
      supabaseClient
        .from("hero_photos")
        .update({ sort_order: newOrder })
        .eq("id", item.id)
    )
  );

  const failed = results.find(result => result.error);

  if (failed) {
    showListMessage("Unable to reorder: " + failed.error.message, true);
  }

  await loadHeroPhotos();
}

function editHeroPhoto(item) {
  editingId = item.id;
  currentImagePath = item.image_path;

  captionInput.value = item.caption || "";
  sortInput.value = item.sort_order ?? 0;
  publishedInput.checked = item.is_published;
  imageInput.value = "";

  preview.src = getImageUrl(item.image_path);
  preview.hidden = !item.image_path;

  formTitle.textContent = "Edit Hero Photo";
  saveButton.textContent = "Update Photo";
  cancelButton.hidden = false;

  showFormMessage("Leave the upload empty to keep the current image.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteHeroPhoto(item) {
  if (!confirm("Delete this hero photo?")) return;

  const { error } = await supabaseClient
    .from("hero_photos")
    .delete()
    .eq("id", item.id);

  if (error) {
    showListMessage("Delete failed: " + error.message, true);
    return;
  }

  await removeHeroImage(item.image_path);

  if (editingId === item.id) resetHeroForm();

  showListMessage("Hero photo deleted successfully.");
  await loadHeroPhotos();
}

heroForm.addEventListener("submit", async event => {
  event.preventDefault();

  const caption = captionInput.value.trim();
  const selectedFile = imageInput.files[0];

  if (!editingId && !selectedFile) {
    showFormMessage("Please select an image to upload.", true);
    return;
  }

  if (selectedFile && !ALLOWED_TYPES.includes(selectedFile.type)) {
    showFormMessage("Please use a JPG, PNG, or WebP image.", true);
    return;
  }

  if (selectedFile && selectedFile.size > MAX_FILE_BYTES) {
    showFormMessage("That image is larger than 5 MB.", true);
    return;
  }

  saveButton.disabled = true;
  showFormMessage("Saving hero photo...");

  let newImagePath = currentImagePath;

  try {
    if (selectedFile) {
      newImagePath = await uploadHeroImage(selectedFile);
    }

    const payload = {
      caption,
      image_path: newImagePath,
      sort_order: Number(sortInput.value) || 0,
      is_published: publishedInput.checked
    };

    let result;

    if (editingId) {
      result = await supabaseClient
        .from("hero_photos")
        .update(payload)
        .eq("id", editingId);
    } else {
      result = await supabaseClient.from("hero_photos").insert(payload);
    }

    if (result.error) {
      if (selectedFile && newImagePath !== currentImagePath) {
        await removeHeroImage(newImagePath);
      }

      throw result.error;
    }

    const oldImagePath = currentImagePath;
    const wasEditing = Boolean(editingId);

    if (selectedFile && wasEditing && oldImagePath) {
      await removeHeroImage(oldImagePath);
    }

    await loadHeroPhotos();
    resetHeroForm();

    showFormMessage(
      wasEditing
        ? "Hero photo updated successfully!"
        : "Hero photo added successfully!"
    );

  } catch (error) {
    showFormMessage("Unable to save photo: " + error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

cancelButton.addEventListener("click", () => {
  resetHeroForm();
  showFormMessage("");
});

async function initializeHeroAdmin() {
  if (typeof supabaseClient === "undefined") {
    showFormMessage("Supabase configuration is missing.", true);
    return;
  }

  const isAdmin = await verifyHeroAdmin();
  if (!isAdmin) return;

  await loadHeroPhotos();
  resetHeroForm();
}

initializeHeroAdmin();
