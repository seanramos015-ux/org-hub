
const galleryForm = document.getElementById("gallery-form");
const titleInput = document.getElementById("gallery-title");
const eventInput = document.getElementById("gallery-event");
const captionInput = document.getElementById("gallery-caption");
const imageInput = document.getElementById("gallery-image");
const publishedInput = document.getElementById("gallery-published");
const preview = document.getElementById("gallery-preview");

const saveButton = document.getElementById("gallery-save");
const cancelButton = document.getElementById("gallery-cancel");
const formTitle = document.getElementById("gallery-form-title");
const formMessage = document.getElementById("gallery-form-message");
const listMessage = document.getElementById("gallery-list-message");
const tableBody = document.getElementById("gallery-table-body");

let editingId = null;
let currentImagePath = null;
let eventsCache = [];

function showFormMessage(message, error = false) {
  formMessage.textContent = message;
  formMessage.style.color = error ? "red" : "green";
}

function showListMessage(message, error = false) {
  listMessage.textContent = message;
  listMessage.style.color = error ? "red" : "green";
}

async function verifyGalleryAdmin() {
  const { data: { session }, error } =
    await supabaseClient.auth.getSession();

  if (error || !session) {
    window.location.href = "admin-login.html";
    return false;
  }

  const { data, error: adminError } =
    await supabaseClient.rpc("is_org_admin");

  if (adminError || data !== true) {
    await supabaseClient.auth.signOut();
    window.location.href = "admin-login.html";
    return false;
  }

  return true;
}

function getImageUrl(path) {
  if (!path) return "";

  // Supports older records that may already contain a full URL.
  if (path.startsWith("https://")) return path;

  const { data } = supabaseClient.storage
    .from("orghub-public")
    .getPublicUrl(path);

  return data.publicUrl;
}

async function loadGalleryEvents() {
  const { data, error } = await supabaseClient
    .from("events")
    .select("id, title")
    .order("starts_at", { ascending: false });

  if (error) {
    showFormMessage("Unable to load events: " + error.message, true);
    return;
  }

  eventsCache = data || [];
  eventInput.replaceChildren();

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "No linked event";
  eventInput.appendChild(emptyOption);

  eventsCache.forEach(event => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = event.title;
    eventInput.appendChild(option);
  });
}

function getEventTitle(eventId) {
  if (!eventId) return "No linked event";

  const event = eventsCache.find(item => item.id === eventId);
  return event ? event.title : "Event not found";
}

function resetGalleryForm() {
  galleryForm.reset();
  editingId = null;
  currentImagePath = null;

  preview.src = "";
  preview.hidden = true;

  formTitle.textContent = "Add Gallery Image";
  saveButton.textContent = "Save Image";
  cancelButton.hidden = true;

  showFormMessage("");
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) {
    preview.src = "";
    preview.hidden = true;
    return;
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    imageInput.value = "";
    preview.src = "";
    preview.hidden = true;
    showFormMessage("Please select a JPG, PNG, or WebP image.", true);
    return;
  }

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  showFormMessage("");
});

async function uploadGalleryImage(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

  if (!allowedExtensions.includes(extension)) {
    throw new Error("Unsupported image file type.");
  }

  const filePath =
    `gallery/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from("orghub-public")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return filePath;
}

async function removeGalleryImage(path) {
  if (!path || path.startsWith("https://")) return;

  const { error } = await supabaseClient.storage
    .from("orghub-public")
    .remove([path]);

  if (error) {
    console.warn("Image storage cleanup failed:", error.message);
  }
}

async function loadGalleryItems() {
  showListMessage("Loading gallery images...");

  const { data, error } = await supabaseClient
    .from("gallery")
    .select("id, event_id, title, image_path, caption, is_published, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showListMessage("Unable to load gallery: " + error.message, true);
    return;
  }

  tableBody.replaceChildren();

  if (!data || data.length === 0) {
    showListMessage("No gallery images have been added yet.");
    return;
  }

  showListMessage("");

  data.forEach(item => {
    const row = document.createElement("tr");

    const imageCell = document.createElement("td");
    const image = document.createElement("img");
    image.className = "gallery-thumb";
    image.src = getImageUrl(item.image_path);
    image.alt = item.title || "Gallery image";
    image.loading = "lazy";
    imageCell.appendChild(image);

    const titleCell = document.createElement("td");
    titleCell.textContent = item.title;

    const eventCell = document.createElement("td");
    eventCell.textContent = getEventTitle(item.event_id);

    const statusCell = document.createElement("td");
    statusCell.textContent = item.is_published ? "Published" : "Unpublished";

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "gallery-action gallery-edit";
    editButton.addEventListener("click", () => editGalleryItem(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "gallery-action gallery-delete";
    deleteButton.addEventListener("click", () => deleteGalleryItem(item));

    actionsCell.append(editButton, deleteButton);
    row.append(imageCell, titleCell, eventCell, statusCell, actionsCell);
    tableBody.appendChild(row);
  });
}

function editGalleryItem(item) {
  editingId = item.id;
  currentImagePath = item.image_path;

  titleInput.value = item.title || "";
  eventInput.value = item.event_id || "";
  captionInput.value = item.caption || "";
  publishedInput.checked = item.is_published;

  preview.src = getImageUrl(item.image_path);
  preview.hidden = !item.image_path;

  formTitle.textContent = "Edit Gallery Image";
  saveButton.textContent = "Update Image";
  cancelButton.hidden = false;

  showFormMessage("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteGalleryItem(item) {
  if (!confirm(`Delete "${item.title}" from the gallery?`)) return;

  const { error } = await supabaseClient
    .from("gallery")
    .delete()
    .eq("id", item.id);

  if (error) {
    showListMessage("Delete failed: " + error.message, true);
    return;
  }

  await removeGalleryImage(item.image_path);

  if (editingId === item.id) resetGalleryForm();

  showListMessage("Gallery image deleted successfully.");
  await loadGalleryItems();
}

galleryForm.addEventListener("submit", async event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const caption = captionInput.value.trim();
  const selectedFile = imageInput.files[0];

  if (!title) {
    showFormMessage("Please enter an image title.", true);
    return;
  }

  if (!editingId && !selectedFile) {
    showFormMessage("Please select an image to upload.", true);
    return;
  }

  if (selectedFile &&
      !["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
    showFormMessage("Please use a JPG, PNG, or WebP image.", true);
    return;
  }

  saveButton.disabled = true;
  showFormMessage("Saving gallery image...");

  let newImagePath = currentImagePath;

  try {
    if (selectedFile) {
      newImagePath = await uploadGalleryImage(selectedFile);
    }

    const payload = {
      title,
      event_id: eventInput.value || null,
      caption,
      image_path: newImagePath,
      is_published: publishedInput.checked
    };

    let result;

    if (editingId) {
      result = await supabaseClient
        .from("gallery")
        .update(payload)
        .eq("id", editingId);
    } else {
      result = await supabaseClient
        .from("gallery")
        .insert(payload);
    }

    if (result.error) {
      if (selectedFile && newImagePath !== currentImagePath) {
        await removeGalleryImage(newImagePath);
      }

      throw result.error;
    }

    const oldImagePath = currentImagePath;
    const wasEditing = Boolean(editingId);

    resetGalleryForm();

    if (selectedFile && wasEditing && oldImagePath) {
      await removeGalleryImage(oldImagePath);
    }

    showFormMessage(
      wasEditing
        ? "Gallery image updated successfully!"
        : "Gallery image added successfully!"
    );

    await loadGalleryItems();

  } catch (error) {
    showFormMessage("Unable to save image: " + error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

cancelButton.addEventListener("click", resetGalleryForm);

async function initializeGalleryAdmin() {
  if (typeof supabaseClient === "undefined") {
    showFormMessage("Supabase configuration is missing.", true);
    return;
  }

  const isAdmin = await verifyGalleryAdmin();
  if (!isAdmin) return;

  await loadGalleryEvents();
  await loadGalleryItems();
}

initializeGalleryAdmin();
