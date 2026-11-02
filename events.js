
// ==========================================
// ORGHUB - EVENTS MANAGEMENT
// Supabase CRUD + Cover Photo Upload
// ==========================================

// DOM ELEMENTS
const eventForm = document.getElementById("event-form");
const eventsTable = document.getElementById("events-table");

const titleInput = document.getElementById("event-title");
const descriptionInput = document.getElementById("event-description");
const locationInput = document.getElementById("event-location");
const startsAtInput = document.getElementById("starts-at");
const endsAtInput = document.getElementById("ends-at");
const statusInput = document.getElementById("event-status");
const publishedInput = document.getElementById("event-published");

const coverInput = document.getElementById("event-cover");
const coverPreview = document.getElementById("cover-preview");

const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");

const formTitle = document.getElementById("form-title");
const formMessage = document.getElementById("form-message");
const listMessage = document.getElementById("list-message");

// STATE
let editingId = null;
let selectedCover = null;
let currentCoverPath = null;
let previewObjectURL = null;


// ==========================================
// MESSAGE HANDLING
// ==========================================

function showFormMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.style.color = isError ? "#b83232" : "#16834a";
}

function showListMessage(message, isError = false) {
    listMessage.textContent = message;
    listMessage.style.color = isError ? "#b83232" : "#263445";
}


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

async function verifyAdmin() {
    try {
        const { data: { session }, error } =
            await supabaseClient.auth.getSession();

        if (error || !session) {
            window.location.href = "admin-login.html";
            return false;
        }

        const { data: isAdmin, error: adminError } =
            await supabaseClient.rpc("is_org_admin");

        if (adminError || !isAdmin) {
            alert("Unauthorized access. Admin privileges required.");

            await supabaseClient.auth.signOut();

            window.location.href = "admin-login.html";
            return false;
        }

        return true;

    } catch (error) {
        console.error("Authentication error:", error);
        window.location.href = "admin-login.html";
        return false;
    }
}


// ==========================================
// DATE AND TIME HELPERS
// ==========================================

// Convert a database timestamp into a local datetime input value.
function toLocalDateTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);

    return localDate.toISOString().slice(0, 16);
}

// Convert a local datetime input into an ISO timestamp.
function toDatabaseTimestamp(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Please enter a valid event date and time.");
    }

    return date.toISOString();
}

function formatEventDate(start, end) {
    if (!start) return "Date not set";

    const startDate = new Date(start);

    const dateText = startDate.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });

    if (!end) return dateText;

    const endDate = new Date(end);

    return dateText + " – " + endDate.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}


// ==========================================
// COVER PHOTO PREVIEW
// ==========================================

function clearCoverPreview() {
    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }

    coverPreview.removeAttribute("src");
    coverPreview.style.display = "none";
}

coverInput.addEventListener("change", () => {
    const file = coverInput.files[0];

    if (!file) {
        selectedCover = null;
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showFormMessage(
            "Please select a JPG, PNG, or WEBP image.",
            true
        );

        coverInput.value = "";
        selectedCover = null;
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showFormMessage(
            "Image must not exceed 10 MB.",
            true
        );

        coverInput.value = "";
        selectedCover = null;
        return;
    }

    selectedCover = file;

    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
    }

    previewObjectURL = URL.createObjectURL(file);

    coverPreview.src = previewObjectURL;
    coverPreview.style.display = "block";

    showFormMessage("Cover photo selected successfully.");
});


// ==========================================
// UPLOAD COVER PHOTO
// ==========================================

async function uploadEventCover(file) {
    const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };

    const extension = extensions[file.type];

    if (!extension) {
        throw new Error("Unsupported image format.");
    }

    const filePath =
        "events/" + crypto.randomUUID() + "." + extension;

    const { data, error } = await supabaseClient
        .storage
        .from("orghub-public")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) throw error;

    const { data: publicURLData } = supabaseClient
        .storage
        .from("orghub-public")
        .getPublicUrl(data.path);

    return publicURLData.publicUrl;
}


// ==========================================
// LOAD EVENTS
// ==========================================

async function loadEvents() {
    showListMessage("Loading event records...");

    const { data: events, error } = await supabaseClient
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false, nullsFirst: false });

    if (error) {
        console.error("Load events error:", error);

        showListMessage(
            "Failed to load events: " + error.message,
            true
        );

        return;
    }

    eventsTable.replaceChildren();

    if (!events || events.length === 0) {
        showListMessage("No event records found.");
        return;
    }

    showListMessage(
        events.length + " event record(s) found."
    );

    events.forEach((event) => {
        const row = document.createElement("tr");

        // COVER PHOTO
        const coverCell = document.createElement("td");

        if (event.cover_image_path) {
            const image = document.createElement("img");

            image.src = event.cover_image_path;
            image.alt = event.title + " cover";
            image.className = "event-thumbnail";

            coverCell.appendChild(image);
        } else {
            coverCell.textContent = "No photo";
        }

        // TITLE
        const titleCell = document.createElement("td");
        titleCell.textContent = event.title || "—";

        // DATE
        const dateCell = document.createElement("td");
        dateCell.textContent = formatEventDate(
            event.starts_at,
            event.ends_at
        );

        // LOCATION
        const locationCell = document.createElement("td");
        locationCell.textContent = event.location || "—";

        // STATUS
        const statusCell = document.createElement("td");
        const status = document.createElement("span");

        status.className = "status";
        status.textContent = event.status || "upcoming";

        statusCell.appendChild(status);

        // PUBLICATION STATUS
        const visibilityCell = document.createElement("td");
        const visibility = document.createElement("span");

        visibility.className = event.is_published
            ? "status published"
            : "status unpublished";

        visibility.textContent = event.is_published
            ? "Published"
            : "Unpublished";

        visibilityCell.appendChild(visibility);

        // ACTIONS
        const actionsCell = document.createElement("td");
        actionsCell.className = "actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "secondary";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editEvent(event);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteEvent(event);
        });

        actionsCell.append(editButton, deleteButton);

        row.append(
            coverCell,
            titleCell,
            dateCell,
            locationCell,
            statusCell,
            visibilityCell,
            actionsCell
        );

        eventsTable.appendChild(row);
    });
}


// ==========================================
// SAVE EVENT
// ==========================================

eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isEditing = editingId !== null;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const startsAt = toDatabaseTimestamp(
            startsAtInput.value
        );

        const endsAt = toDatabaseTimestamp(
            endsAtInput.value
        );

        if (startsAt && endsAt &&
            new Date(endsAt) < new Date(startsAt)) {
            throw new Error(
                "The event end date cannot be earlier than its start date."
            );
        }

        const eventData = {
            title: titleInput.value.trim(),
            description: descriptionInput.value.trim(),
            location: locationInput.value.trim(),
            starts_at: startsAt,
            ends_at: endsAt,
            status: statusInput.value,
            cover_image_path: currentCoverPath,
            is_published: publishedInput.checked
        };

        if (!eventData.title) {
            throw new Error("Please enter an event title.");
        }

        // UPLOAD NEW COVER PHOTO
        if (selectedCover) {
            showFormMessage("Uploading event cover photo...");

            eventData.cover_image_path =
                await uploadEventCover(selectedCover);
        }

        // UPDATE EXISTING EVENT
        if (isEditing) {
            const { error } = await supabaseClient
                .from("events")
                .update(eventData)
                .eq("id", editingId);

            if (error) throw error;

            showFormMessage("Event updated successfully!");

        } else {
            // INSERT NEW EVENT
            const { error } = await supabaseClient
                .from("events")
                .insert([eventData]);

            if (error) throw error;

            showFormMessage("Event added successfully!");
        }

        resetForm();
        await loadEvents();

    } catch (error) {
        console.error("Save event error:", error);

        showFormMessage(
            "Unable to save event: " + error.message,
            true
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingId !== null
            ? "Update Event"
            : "Save Event";
    }
});


// ==========================================
// EDIT EVENT
// ==========================================

function editEvent(event) {
    editingId = event.id;

    titleInput.value = event.title || "";
    descriptionInput.value = event.description || "";
    locationInput.value = event.location || "";

    startsAtInput.value = toLocalDateTime(event.starts_at);
    endsAtInput.value = toLocalDateTime(event.ends_at);

    statusInput.value = event.status || "upcoming";
    publishedInput.checked = event.is_published ?? false;

    currentCoverPath = event.cover_image_path || null;

    selectedCover = null;
    coverInput.value = "";

    clearCoverPreview();

    if (currentCoverPath) {
        coverPreview.src = currentCoverPath;
        coverPreview.style.display = "block";
    }

    formTitle.textContent = "Edit Event";
    saveButton.textContent = "Update Event";
    cancelButton.hidden = false;

    showFormMessage("Editing " + event.title + ".");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ==========================================
// DELETE EVENT
// ==========================================

async function deleteEvent(event) {
    const confirmed = confirm(
        "Are you sure you want to delete '" +
        event.title + "'?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("events")
        .delete()
        .eq("id", event.id);

    if (error) {
        console.error("Delete event error:", error);

        showListMessage(
            "Failed to delete event: " + error.message,
            true
        );

        return;
    }

    if (editingId === event.id) {
        resetForm();
    }

    showListMessage("Event deleted successfully.");

    await loadEvents();
}


// ==========================================
// RESET FORM
// ==========================================

function resetForm() {
    eventForm.reset();

    editingId = null;
    selectedCover = null;
    currentCoverPath = null;

    coverInput.value = "";

    clearCoverPreview();

    formTitle.textContent = "Add New Event";
    saveButton.textContent = "Save Event";
    cancelButton.hidden = true;

    showFormMessage("");
}


// ==========================================
// CANCEL EDITING
// ==========================================

cancelButton.addEventListener("click", () => {
    resetForm();
});


// ==========================================
// INITIALIZE PAGE
// ==========================================

async function initializeEventsPage() {
    const authorized = await verifyAdmin();

    if (!authorized) return;

    await loadEvents();
}

initializeEventsPage();
