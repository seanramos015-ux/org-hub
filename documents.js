
// ============================================
// ORGHUB - DOCUMENT MANAGEMENT
// Phase 6A: Reports and Resolutions
// ============================================

// DOM ELEMENTS
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

// CONFIGURATION
const DOCUMENT_BUCKET = "orghub-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

let editingId = null;
let currentFilePath = null;

// DOCUMENT CATEGORY LABELS
const categoryLabels = {
  narrative_report: "Narrative Report",
  resolution: "Resolution",
  financial_report: "Financial Report",
  accomplishment_report: "Accomplishment Report",
  activity_report: "Activity Report"
};


// ============================================
// MESSAGE HELPERS
// ============================================

function showFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "red" : "green";
}

function showListMessage(message, isError = false) {
  listMessage.textContent = message;
  listMessage.style.color = isError ? "red" : "green";
}


// ============================================
// ADMIN VERIFICATION
// ============================================

async function verifyDocumentAdmin() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

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


// ============================================
// PUBLICATION CONTROL
// ============================================

function updatePublicationControl() {
  const isFinancial =
    categoryInput.value === "financial_report";

  // Financial reports can be published,
  // but require confirmation during saving.
  publishedInput.disabled = false;

  publishedInput.parentElement.title = isFinancial
    ? "Review this financial report carefully before publishing."
    : "";
}


// ============================================
// PDF UPLOAD
// ============================================

async function uploadDocument(file) {
  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("Only PDF files are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("PDF file must not exceed 10 MB.");
  }

  const filePath =
    `documents/${crypto.randomUUID()}.pdf`;

  const { error } = await supabaseClient.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf"
    });

  if (error) {
    throw error;
  }

  return filePath;
}


// ============================================
// PDF DELETION
// ============================================

async function removeDocumentFile(path) {
  if (!path) return;

  const { error } = await supabaseClient.storage
    .from(DOCUMENT_BUCKET)
    .remove([path]);

  if (error) {
    console.warn(
      "Unable to remove document file:",
      error.message
    );
  }
}


// ============================================
// RESET FORM
// ============================================

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


// ============================================
// TABLE CELL HELPER
// ============================================

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
  return cell;
}


// ============================================
// LOAD DOCUMENTS
// ============================================

async function loadDocuments() {
  showListMessage("Loading documents...");

  const { data, error } = await supabaseClient
    .from("documents")
    .select(`
      id,
      category,
      reference_number,
      title,
      description,
      document_date,
      file_path,
      is_published,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    showListMessage(
      "Unable to load documents: " + error.message,
      true
    );
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

    // TITLE
    row.appendChild(createCell(item.title));

    // CATEGORY
    row.appendChild(
      createCell(categoryLabels[item.category] || item.category)
    );

    // REFERENCE NUMBER
    row.appendChild(createCell(item.reference_number));

    // DOCUMENT DATE
    row.appendChild(createCell(item.document_date));

    // PUBLICATION STATUS
    const statusCell = createCell(
      item.is_published ? "Published" : "Unpublished"
    );

    statusCell.className = item.is_published
      ? "document-public"
      : "document-private";

    row.appendChild(statusCell);

    // ACTIONS
    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "document-action document-edit";

    editButton.addEventListener("click", () => {
      editDocument(item);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "document-action document-delete";

    deleteButton.addEventListener("click", () => {
      deleteDocument(item);
    });

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  });
}


// ============================================
// EDIT DOCUMENT
// ============================================

function editDocument(item) {
  editingId = item.id;
  currentFilePath = item.file_path;

  categoryInput.value = item.category;
  referenceInput.value = item.reference_number || "";
  titleInput.value = item.title || "";
  descriptionInput.value = item.description || "";
  dateInput.value = item.document_date || "";

  publishedInput.checked = item.is_published;

  fileInput.value = "";

  currentFileMessage.textContent =
    "A PDF is already uploaded. Select another PDF only if you want to replace it.";

  formTitle.textContent = "Edit Document";
  saveButton.textContent = "Update Document";

  cancelButton.hidden = false;

  updatePublicationControl();
  showFormMessage("");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ============================================
// DELETE DOCUMENT
// ============================================

async function deleteDocument(item) {
  const confirmed = confirm(
    `Are you sure you want to delete "${item.title}" and its uploaded PDF?`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("documents")
    .delete()
    .eq("id", item.id);

  if (error) {
    showListMessage(
      "Delete failed: " + error.message,
      true
    );
    return;
  }

  await removeDocumentFile(item.file_path);

  if (editingId === item.id) {
    resetDocumentForm();
  }

  showListMessage("Document deleted successfully!");

  await loadDocuments();
}


// ============================================
// SAVE / UPDATE DOCUMENT
// ============================================

documentForm.addEventListener("submit", async event => {
  event.preventDefault();

  const selectedFile = fileInput.files[0];

  const category = categoryInput.value;
  const isFinancial = category === "financial_report";

  const wantsToPublish = publishedInput.checked;

  const title = titleInput.value.trim();

  // VALIDATE TITLE
  if (!title) {
    showFormMessage(
      "Please enter a document title.",
      true
    );
    return;
  }

  // VALIDATE REQUIRED PDF FOR NEW DOCUMENTS
  if (!editingId && !selectedFile) {
    showFormMessage(
      "Please select a PDF file.",
      true
    );
    return;
  }

  // VALIDATE PDF TYPE AND SIZE
  if (selectedFile) {
    if (
      selectedFile.type !== "application/pdf" ||
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      showFormMessage(
        "Please select a valid PDF file.",
        true
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      showFormMessage(
        "PDF file must not exceed 10 MB.",
        true
      );
      return;
    }
  }

  // ==========================================
  // FINANCIAL REPORT PUBLICATION WARNING
  // ==========================================

  if (isFinancial && wantsToPublish) {
    const confirmed = confirm(
      "FINANCIAL REPORT PUBLICATION WARNING\n\n" +

      "You are about to publish a financial report " +
      "on the public OrgHub website.\n\n" +

      "PLEASE CONFIRM THAT:\n" +

      "1. The report has been reviewed and approved " +
      "for public disclosure.\n\n" +

      "2. No confidential personal, banking, or " +
      "sensitive information is exposed.\n\n" +

      "3. The financial figures and information " +
      "are accurate.\n\n" +

      "4. You are authorized to publish this document.\n\n" +

      "Once published, visitors may access the PDF.\n\n" +

      "Do you want to continue?"
    );

    if (!confirmed) {
      publishedInput.checked = false;

      showFormMessage(
        "Publication cancelled. The financial report remains unpublished."
      );

      return;
    }
  }

  // ==========================================
  // BEGIN SAVING
  // ==========================================

  saveButton.disabled = true;

  showFormMessage("Saving document...");

  let newFilePath = currentFilePath;

  try {

    // UPLOAD NEW PDF IF SELECTED
    if (selectedFile) {
      newFilePath = await uploadDocument(selectedFile);
    }

    // DATABASE PAYLOAD
    const payload = {
      category: category,

      reference_number:
        referenceInput.value.trim() || null,

      title: title,

      description:
        descriptionInput.value.trim() || null,

      document_date:
        dateInput.value || null,

      file_path: newFilePath,

      // Financial reports can now be published,
      // but only after the confirmation above.
      is_published: publishedInput.checked
    };

    let result;

    // UPDATE EXISTING DOCUMENT
    if (editingId) {
      result = await supabaseClient
        .from("documents")
        .update(payload)
        .eq("id", editingId);

    } else {

      // INSERT NEW DOCUMENT
      result = await supabaseClient
        .from("documents")
        .insert(payload);
    }

    // DATABASE ERROR
    if (result.error) {

      // Remove newly uploaded file if saving failed.
      if (
        selectedFile &&
        newFilePath !== currentFilePath
      ) {
        await removeDocumentFile(newFilePath);
      }

      throw result.error;
    }

    // SAVE SUCCESSFUL
    const oldFilePath = currentFilePath;
    const wasEditing = Boolean(editingId);

    // RESET FORM
    resetDocumentForm();

    // REMOVE OLD PDF AFTER SUCCESSFUL REPLACEMENT
    if (
      selectedFile &&
      wasEditing &&
      oldFilePath &&
      oldFilePath !== newFilePath
    ) {
      await removeDocumentFile(oldFilePath);
    }

    const successMessage = wasEditing
      ? "Document updated successfully!"
      : "Document uploaded successfully!";

    showFormMessage(successMessage);

    // REFRESH TABLE
    await loadDocuments();

  } catch (error) {

    console.error("Document save error:", error);

    showFormMessage(
      "Unable to save document: " + error.message,
      true
    );

  } finally {

    saveButton.disabled = false;

  }
});


// ============================================
// CANCEL EDITING
// ============================================

cancelButton.addEventListener("click", () => {
  resetDocumentForm();
});


// ============================================
// CATEGORY CHANGE
// ============================================

categoryInput.addEventListener("change", () => {
  updatePublicationControl();
});


// ============================================
// INITIALIZE DOCUMENT MANAGEMENT
// ============================================

async function initializeDocumentsAdmin() {

  if (typeof supabaseClient === "undefined") {
    showFormMessage(
      "Supabase configuration is missing.",
      true
    );
    return;
  }

  const isAdmin = await verifyDocumentAdmin();

  if (!isAdmin) return;

  updatePublicationControl();

  await loadDocuments();
}

initializeDocumentsAdmin();
