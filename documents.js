
const documentForm = document.getElementById("document-form");
const categoryInput = document.getElementById("document-category");
const referenceInput = document.getElementById("document-reference");
const titleInput = document.getElementById("document-title");
const descriptionInput = document.getElementById("document-description");
const dateInput = document.getElementById("document-date");
const fileInput = document.getElementById("document-file");
const publishedInput = document.getElementById("document-published");

const saveButton = document.getElementById("document-save");
const cancelButton = document.getElementById("document-cancel");
const formTitle = document.getElementById("document-form-title");
const formMessage = document.getElementById("document-form-message");
const listMessage = document.getElementById("document-list-message");
const tableBody = document.getElementById("documents-table-body");
const currentFileMessage = document.getElementById("current-file-message");

const DOCUMENT_BUCKET = "orghub-documents";

let editingId = null;
let currentFilePath = null;

const categoryLabels = {
  narrative_report: "Narrative Report",
  resolution: "Resolution",
  financial_report: "Financial Report",
  accomplishment_report: "Accomplishment Report",
  activity_report: "Activity Report"
};

function showFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "red" : "green";
}

function showListMessage(message, isError = false) {
  listMessage.textContent = message;
  listMessage.style.color = isError ? "red" : "green";
}

async function verifyDocumentAdmin() {
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

function updatePublicationControl() {
  const isFinancial = categoryInput.value === "financial_report";

  if (isFinancial) {
    publishedInput.checked = false;
    publishedInput.disabled = true;
  } else {
    publishedInput.disabled = false;
  }
}

categoryInput.addEventListener("change", updatePublicationControl);

async function uploadDocument(file) {
  if (file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are allowed.");
  }

  const filePath = `documents/${crypto.randomUUID()}.pdf`;

  const { error } = await supabaseClient.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf"
    });

  if (error) throw error;

  return filePath;
}

async function removeDocumentFile(path) {
  if (!path) return;

  const { error } = await supabaseClient.storage
    .from(DOCUMENT_BUCKET)
    .remove([path]);

  if (error) {
    console.warn("File cleanup failed:", error.message);
  }
}

function resetDocumentForm() {
  documentForm.reset();

  editingId = null;
  currentFilePath = null;

  currentFileMessage.textContent = "";
  formTitle.textContent = "Add Document";
  saveButton.textContent = "Save Document";
  cancelButton.hidden = true;

  updatePublicationControl();
  showFormMessage("");
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
  return cell;
}

async function loadDocuments() {
  showListMessage("Loading documents...");

  const { data, error } = await supabaseClient
    .from("documents")
    .select("id, category, reference_number, title, description, document_date, file_path, is_published, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showListMessage("Unable to load documents: " + error.message, true);
    return;
  }

  tableBody.replaceChildren();

  if (!data || data.length === 0) {
    showListMessage("No documents have been uploaded yet.");
    return;
  }

  showListMessage("");

  data.forEach(item => {
    const row = document.createElement("tr");

    row.appendChild(createCell(item.title));
    row.appendChild(createCell(categoryLabels[item.category] || item.category));
    row.appendChild(createCell(item.reference_number));
    row.appendChild(createCell(item.document_date));

    const statusCell = createCell(
      item.category === "financial_report"
        ? "Private"
        : item.is_published ? "Published" : "Unpublished"
    );

    statusCell.className =
      item.category === "financial_report" || !item.is_published
        ? "document-private"
        : "document-public";

    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "document-action document-edit";
    editButton.addEventListener("click", () => editDocument(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "document-action document-delete";
    deleteButton.addEventListener("click", () => deleteDocument(item));

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  });
}

function editDocument(item) {
  editingId = item.id;
  currentFilePath = item.file_path;

  categoryInput.value = item.category;
  referenceInput.value = item.reference_number || "";
  titleInput.value = item.title || "";
  descriptionInput.value = item.description || "";
  dateInput.value = item.document_date || "";
  publishedInput.checked =
    item.category !== "financial_report" && item.is_published;

  currentFileMessage.textContent =
    "A PDF is already uploaded. Select another file only if you want to replace it.";

  formTitle.textContent = "Edit Document";
  saveButton.textContent = "Update Document";
  cancelButton.hidden = false;

  updatePublicationControl();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteDocument(item) {
  if (!confirm(`Delete "${item.title}" and its uploaded PDF?`)) return;

  const { error } = await supabaseClient
    .from("documents")
    .delete()
    .eq("id", item.id);

  if (error) {
    showListMessage("Delete failed: " + error.message, true);
    return;
  }

  await removeDocumentFile(item.file_path);

  if (editingId === item.id) resetDocumentForm();

  showListMessage("Document deleted successfully.");
  await loadDocuments();
}

documentForm.addEventListener("submit", async event => {
  event.preventDefault();

  const selectedFile = fileInput.files[0];
  const isFinancial = categoryInput.value === "financial_report";

  if (!titleInput.value.trim()) {
    showFormMessage("Please enter a document title.", true);
    return;
  }

  if (!editingId && !selectedFile) {
    showFormMessage("Please select a PDF file.", true);
    return;
  }

  if (selectedFile &&
      (selectedFile.type !== "application/pdf" ||
       !selectedFile.name.toLowerCase().endsWith(".pdf"))) {
    showFormMessage("Please select a valid PDF file.", true);
    return;
  }

  saveButton.disabled = true;
  showFormMessage("Saving document...");

  let newFilePath = currentFilePath;

  try {
    if (selectedFile) {
      newFilePath = await uploadDocument(selectedFile);
    }

    const payload = {
      category: categoryInput.value,
      reference_number: referenceInput.value.trim() || null,
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim() || null,
      document_date: dateInput.value || null,
      file_path: newFilePath,
      is_published: isFinancial ? false : publishedInput.checked
    };

    let result;

    if (editingId) {
      result = await supabaseClient
        .from("documents")
        .update(payload)
        .eq("id", editingId);
    } else {
      result = await supabaseClient
        .from("documents")
        .insert(payload);
    }

    if (result.error) {
      if (selectedFile && newFilePath !== currentFilePath) {
        await removeDocumentFile(newFilePath);
      }

      throw result.error;
    }

    const oldFilePath = currentFilePath;
    const wasEditing = Boolean(editingId);

    resetDocumentForm();

    if (selectedFile && wasEditing && oldFilePath) {
      await removeDocumentFile(oldFilePath);
    }

    showFormMessage(
      wasEditing
        ? "Document updated successfully!"
        : "Document uploaded successfully!"
    );

    await loadDocuments();

  } catch (error) {
    showFormMessage("Unable to save document: " + error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

cancelButton.addEventListener("click", resetDocumentForm);

async function initializeDocumentsAdmin() {
  if (typeof supabaseClient === "undefined") {
    showFormMessage("Supabase configuration is missing.", true);
    return;
  }

  const isAdmin = await verifyDocumentAdmin();
  if (!isAdmin) return;

  updatePublicationControl();
  await loadDocuments();
}

initializeDocumentsAdmin();
