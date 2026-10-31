
const form = document.getElementById("officer-form");
const tableBody = document.getElementById("officers-table");
const formMessage = document.getElementById("form-message");
const listMessage = document.getElementById("list-message");

const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const formTitle = document.getElementById("form-title");

let editingId = null;

// Verify that the user is an authorized administrator
async function verifyAdmin() {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
        window.location.replace("admin-login.html");
        return false;
    }

    const { data: isAdmin, error: adminError } =
        await supabaseClient.rpc("is_org_admin");

    if (adminError) throw adminError;

    if (isAdmin !== true) {
        await supabaseClient.auth.signOut();
        window.location.replace("admin-login.html");
        return false;
    }

    return true;
}

// Load officer records
async function loadOfficers() {
    listMessage.textContent = "Loading officers...";
    tableBody.replaceChildren();

    const { data, error } = await supabaseClient
        .from("officers")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("full_name", { ascending: true });

    if (error) {
        listMessage.textContent = "Unable to load officers: " + error.message;
        return;
    }

    listMessage.textContent = data.length
        ? data.length + " officer record(s) found."
        : "No officer records yet.";

    data.forEach(officer => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = officer.full_name;

        const positionCell = document.createElement("td");
        positionCell.textContent = officer.position;

        const courseCell = document.createElement("td");
        courseCell.textContent = officer.course_year || "—";

        const statusCell = document.createElement("td");
        statusCell.textContent = officer.is_published
            ? "Published"
            : "Unpublished";

        statusCell.className = officer.is_published
            ? "status published"
            : "status unpublished";

        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "actions";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "secondary";
        editButton.addEventListener("click", () => editOfficer(officer));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "danger";
        deleteButton.addEventListener("click", () => deleteOfficer(officer));

        actions.append(editButton, deleteButton);
        actionsCell.appendChild(actions);

        row.append(
            nameCell,
            positionCell,
            courseCell,
            statusCell,
            actionsCell
        );

        tableBody.appendChild(row);
    });
}

// Add or update an officer
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    formMessage.textContent = "";

    const officerData = {
        full_name: document.getElementById("full-name").value.trim(),
        position: document.getElementById("position").value.trim(),
        course_year: document.getElementById("course-year").value.trim() || null,
        bio: document.getElementById("bio").value.trim() || null,
        sort_order: Number(document.getElementById("sort-order").value) || 0,
        is_published: document.getElementById("is-published").checked
    };

    try {
        let result;

        if (editingId) {
            result = await supabaseClient
                .from("officers")
                .update(officerData)
                .eq("id", editingId);
        } else {
            result = await supabaseClient
                .from("officers")
                .insert([officerData]);
        }

        if (result.error) throw result.error;

        formMessage.style.color = "green";
        formMessage.textContent = editingId
            ? "Officer updated successfully!"
            : "Officer added successfully!";

        resetForm();
        await loadOfficers();

    } catch (error) {
        formMessage.style.color = "red";
        formMessage.textContent = error.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingId ? "Update Officer" : "Save Officer";
    }
});

// Load an officer into the form for editing
function editOfficer(officer) {
    editingId = officer.id;

    document.getElementById("full-name").value = officer.full_name;
    document.getElementById("position").value = officer.position;
    document.getElementById("course-year").value = officer.course_year || "";
    document.getElementById("bio").value = officer.bio || "";
    document.getElementById("sort-order").value = officer.sort_order;
    document.getElementById("is-published").checked = officer.is_published;

    formTitle.textContent = "Edit Officer";
    saveButton.textContent = "Update Officer";
    cancelButton.hidden = false;

    formMessage.textContent = "Editing: " + officer.full_name;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete an officer
async function deleteOfficer(officer) {
    const confirmed = window.confirm(
        "Are you sure you want to delete " + officer.full_name + "?"
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("officers")
        .delete()
        .eq("id", officer.id);

    if (error) {
        listMessage.textContent = "Delete failed: " + error.message;
        return;
    }

    listMessage.textContent = "Officer deleted successfully.";
    await loadOfficers();

    if (editingId === officer.id) resetForm();
}

// Reset the form
function resetForm() {
    form.reset();
    editingId = null;

    document.getElementById("sort-order").value = 0;
    document.getElementById("is-published").checked = true;

    formTitle.textContent = "Add New Officer";
    saveButton.textContent = "Save Officer";
    cancelButton.hidden = true;
}

// Cancel editing
cancelButton.addEventListener("click", () => {
    resetForm();
    formMessage.textContent = "";
});

// Initialize the page
async function initializeOfficersPage() {
    try {
        const authorized = await verifyAdmin();

        if (!authorized) return;

        await loadOfficers();

    } catch (error) {
        console.error(error);
        listMessage.textContent =
            "Unable to verify administrator access: " + error.message;
    }
}

initializeOfficersPage();
