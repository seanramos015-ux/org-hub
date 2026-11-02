
// ==========================================
// ORGHUB - OFFICERS MANAGEMENT
// Supabase CRUD + Photo Upload
// ==========================================

// DOM ELEMENTS
const officerForm = document.getElementById("officer-form");
const officerTable = document.getElementById("officers-table");

const fullNameInput = document.getElementById("full-name");
const positionInput = document.getElementById("position");
const courseYearInput = document.getElementById("course-year");
const sortOrderInput = document.getElementById("sort-order");
const bioInput = document.getElementById("bio");
const publishedInput = document.getElementById("is-published");

const photoInput = document.getElementById("officer-photo");
const photoPreview = document.getElementById("photo-preview");

const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");

const formTitle = document.getElementById("form-title");
const formMessage = document.getElementById("form-message");
const listMessage = document.getElementById("list-message");

// STATE
let editingId = null;
let selectedPhoto = null;
let currentPhotoPath = null;
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
// PHOTO PREVIEW
// ==========================================

function clearPhotoPreview() {
    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }

    photoPreview.removeAttribute("src");
    photoPreview.style.display = "none";
}

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) {
        selectedPhoto = null;
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

        photoInput.value = "";
        selectedPhoto = null;
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showFormMessage(
            "Image must not exceed 10 MB.",
            true
        );

        photoInput.value = "";
        selectedPhoto = null;
        return;
    }

    selectedPhoto = file;

    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
    }

    previewObjectURL = URL.createObjectURL(file);

    photoPreview.src = previewObjectURL;
    photoPreview.style.display = "block";

    showFormMessage("Photo selected successfully.");
});


// ==========================================
// UPLOAD OFFICER PHOTO
// ==========================================

async function uploadOfficerPhoto(file) {
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
        "officers/" + crypto.randomUUID() + "." + extension;

    const { data, error } = await supabaseClient
        .storage
        .from("orghub-public")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) {
        throw error;
    }

    const { data: publicURLData } = supabaseClient
        .storage
        .from("orghub-public")
        .getPublicUrl(data.path);

    return publicURLData.publicUrl;
}


// ==========================================
// LOAD OFFICERS
// ==========================================

async function loadOfficers() {
    showListMessage("Loading officer records...");

    const { data: officers, error } = await supabaseClient
        .from("officers")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Load officers error:", error);
        showListMessage(
            "Failed to load officers: " + error.message,
            true
        );
        return;
    }

    officerTable.innerHTML = "";

    if (!officers || officers.length === 0) {
        showListMessage("No officer records found.");
        return;
    }

    showListMessage(
        officers.length + " officer record(s) found."
    );

    officers.forEach((officer) => {
        const row = document.createElement("tr");

        // NAME
        const nameCell = document.createElement("td");
        nameCell.textContent = officer.full_name || "—";

        // POSITION
        const positionCell = document.createElement("td");
        positionCell.textContent = officer.position || "—";

        // COURSE AND YEAR
        const courseCell = document.createElement("td");
        courseCell.textContent = officer.course_year || "—";

        // PUBLICATION STATUS
        const statusCell = document.createElement("td");
        const status = document.createElement("span");

        status.className = officer.is_published
            ? "status published"
            : "status unpublished";

        status.textContent = officer.is_published
            ? "Published"
            : "Unpublished";

        statusCell.appendChild(status);

        // ACTIONS
        const actionsCell = document.createElement("td");
        actionsCell.className = "actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "secondary";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editOfficer(officer);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteOfficer(officer);
        });

        actionsCell.append(editButton, deleteButton);

        row.append(
            nameCell,
            positionCell,
            courseCell,
            statusCell,
            actionsCell
        );

        officerTable.appendChild(row);
    });
}


// ==========================================
// SAVE OFFICER
// ==========================================

officerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isEditing = editingId !== null;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const officerData = {
            full_name: fullNameInput.value.trim(),
            position: positionInput.value.trim(),
            course_year: courseYearInput.value.trim(),
            bio: bioInput.value.trim(),
            sort_order: Number(sortOrderInput.value) || 0,
            is_published: publishedInput.checked,
            photo_path: currentPhotoPath
        };

        if (!officerData.full_name || !officerData.position) {
            throw new Error(
                "Please enter the officer's full name and position."
            );
        }

        // UPLOAD NEW PHOTO IF SELECTED
        if (selectedPhoto) {
            showFormMessage("Uploading officer photo...");

            officerData.photo_path =
                await uploadOfficerPhoto(selectedPhoto);
        }

        // UPDATE EXISTING OFFICER
        if (isEditing) {
            const { error } = await supabaseClient
                .from("officers")
                .update(officerData)
                .eq("id", editingId);

            if (error) throw error;

            showFormMessage("Officer updated successfully!");

        } else {
            // INSERT NEW OFFICER
            const { error } = await supabaseClient
                .from("officers")
                .insert([officerData]);

            if (error) throw error;

            showFormMessage("Officer added successfully!");
        }

        resetForm();
        await loadOfficers();

    } catch (error) {
        console.error("Save officer error:", error);

        showFormMessage(
            "Unable to save officer: " + error.message,
            true
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingId !== null
            ? "Update Officer"
            : "Save Officer";
    }
});


// ==========================================
// EDIT OFFICER
// ==========================================

function editOfficer(officer) {
    editingId = officer.id;

    fullNameInput.value = officer.full_name || "";
    positionInput.value = officer.position || "";
    courseYearInput.value = officer.course_year || "";
    bioInput.value = officer.bio || "";
    sortOrderInput.value = officer.sort_order ?? 0;
    publishedInput.checked = officer.is_published ?? false;

    // KEEP EXISTING PHOTO
    currentPhotoPath = officer.photo_path || null;

    selectedPhoto = null;
    photoInput.value = "";

    clearPhotoPreview();

    if (currentPhotoPath) {
        photoPreview.src = currentPhotoPath;
        photoPreview.style.display = "block";
    }

    // UPDATE FORM APPEARANCE
    formTitle.textContent = "Edit Officer";
    saveButton.textContent = "Update Officer";
    cancelButton.hidden = false;

    showFormMessage(
        "Editing " + officer.full_name + "."
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ==========================================
// DELETE OFFICER
// ==========================================

async function deleteOfficer(officer) {
    const confirmed = confirm(
        "Are you sure you want to delete " +
        officer.full_name + "?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("officers")
        .delete()
        .eq("id", officer.id);

    if (error) {
        console.error("Delete officer error:", error);

        showListMessage(
            "Failed to delete officer: " + error.message,
            true
        );

        return;
    }

    if (editingId === officer.id) {
        resetForm();
    }

    showListMessage("Officer deleted successfully.");

    await loadOfficers();
}


// ==========================================
// RESET FORM
// ==========================================

function resetForm() {
    officerForm.reset();

    editingId = null;
    selectedPhoto = null;
    currentPhotoPath = null;

    photoInput.value = "";

    clearPhotoPreview();

    formTitle.textContent = "Add New Officer";
    saveButton.textContent = "Save Officer";
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

async function initializeOfficersPage() {
    const authorized = await verifyAdmin();

    if (!authorized) return;

    await loadOfficers();
}

initializeOfficersPage();
