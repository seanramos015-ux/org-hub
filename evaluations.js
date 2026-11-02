
const form = document.getElementById("evaluation-form");
const titleInput = document.getElementById("evaluation-title");
const eventSelect = document.getElementById("evaluation-event");
const urlInput = document.getElementById("form-url");
const publishedInput = document.getElementById("evaluation-published");

const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const formTitle = document.getElementById("form-title");
const formMessage = document.getElementById("form-message");
const listMessage = document.getElementById("list-message");
const tableBody = document.getElementById("evaluations-table");

let editingId = null;
let eventsCache = [];

function showFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "red" : "green";
}

function showListMessage(message, isError = false) {
  listMessage.textContent = message;
  listMessage.style.color = isError ? "red" : "green";
}

async function verifyAdmin() {
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

async function loadEvents() {
  const { data, error } = await supabaseClient
    .from("events")
    .select("id, title")
    .order("starts_at", { ascending: false });

  if (error) {
    showFormMessage("Unable to load events: " + error.message, true);
    return;
  }

  eventsCache = data || [];

  eventSelect.replaceChildren();

  const noEventOption = document.createElement("option");
  noEventOption.value = "";
  noEventOption.textContent = "No linked event";
  eventSelect.appendChild(noEventOption);

  eventsCache.forEach(event => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = event.title;
    eventSelect.appendChild(option);
  });
}

function resetForm() {
  form.reset();
  editingId = null;

  formTitle.textContent = "Add Evaluation Form";
  saveButton.textContent = "Save Evaluation";
  cancelButton.hidden = true;

  showFormMessage("");
}

function getEventTitle(eventId) {
  if (!eventId) return "No linked event";

  const event = eventsCache.find(item => item.id === eventId);
  return event ? event.title : "Event not found";
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

async function loadEvaluations() {
  showListMessage("Loading evaluation forms...");

  const { data, error } = await supabaseClient
    .from("evaluation_forms")
    .select("id, event_id, title, form_url, is_published, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showListMessage("Unable to load evaluation forms: " + error.message, true);
    return;
  }

  tableBody.replaceChildren();

  if (!data || data.length === 0) {
    showListMessage("No evaluation forms have been added yet.");
    return;
  }

  showListMessage("");

  data.forEach(item => {
    const row = document.createElement("tr");

    row.appendChild(createCell(item.title));
    row.appendChild(createCell(getEventTitle(item.event_id)));

    const statusCell = document.createElement("td");
    statusCell.textContent = item.is_published ? "Published" : "Unpublished";
    statusCell.className = item.is_published
      ? "status-published"
      : "status-hidden";
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "table-action edit-btn";
    editButton.addEventListener("click", () => editEvaluation(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "table-action delete-btn";
    deleteButton.addEventListener("click", () => deleteEvaluation(item));

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  });
}

function editEvaluation(item) {
  editingId = item.id;

  titleInput.value = item.title || "";
  eventSelect.value = item.event_id || "";
  urlInput.value = item.form_url || "";
  publishedInput.checked = item.is_published;

  formTitle.textContent = "Edit Evaluation Form";
  saveButton.textContent = "Update Evaluation";
  cancelButton.hidden = false;

  showFormMessage("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteEvaluation(item) {
  const confirmed = confirm(
    `Are you sure you want to delete "${item.title}"?`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("evaluation_forms")
    .delete()
    .eq("id", item.id);

  if (error) {
    showListMessage("Delete failed: " + error.message, true);
    return;
  }

  showListMessage("Evaluation form deleted successfully.");
  if (editingId === item.id) resetForm();

  await loadEvaluations();
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const formUrl = urlInput.value.trim();

  if (!title || !formUrl) {
    showFormMessage("Please complete the required fields.", true);
    return;
  }

  try {
    const parsedUrl = new URL(formUrl);

    if (parsedUrl.protocol !== "https:") {
      showFormMessage("Please enter a secure HTTPS link.", true);
      return;
    }
  } catch {
    showFormMessage("Please enter a valid form URL.", true);
    return;
  }

  const payload = {
    title,
    event_id: eventSelect.value || null,
    form_url: formUrl,
    is_published: publishedInput.checked
  };

  saveButton.disabled = true;
  showFormMessage("Saving evaluation form...");

  let result;

  if (editingId) {
    result = await supabaseClient
      .from("evaluation_forms")
      .update(payload)
      .eq("id", editingId);
  } else {
    result = await supabaseClient
      .from("evaluation_forms")
      .insert(payload);
  }

  saveButton.disabled = false;

  if (result.error) {
    showFormMessage("Unable to save: " + result.error.message, true);
    return;
  }

  const successMessage = editingId
    ? "Evaluation form updated successfully!"
    : "Evaluation form added successfully!";

  resetForm();
  showFormMessage(successMessage);

  await loadEvaluations();
});

cancelButton.addEventListener("click", resetForm);

async function initializePage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return;

  await loadEvents();
  await loadEvaluations();
}

initializePage();
