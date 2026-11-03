
const DOCUMENT_BUCKET = "orghub-documents";
const SIGNED_URL_EXPIRY = 600; // 10 minutes

const reportsList = document.getElementById("reports-list");
const reportsCount = document.getElementById("reports-count");

const reportCategories = {
    narrative_report: "Narrative Report",
    accomplishment_report: "Accomplishment Report",
    activity_report: "Activity Report",
    financial_report: "Financial Report"
};

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDocumentDate(dateValue) {
    if (!dateValue) return "Date not specified";

    const date = new Date(dateValue + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        return "Date not specified";
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function renderReports(documents) {
    if (!documents.length) {
        reportsCount.textContent = "0 reports";
        reportsList.innerHTML = `
            <p>No published reports are available yet.</p>
        `;
        return;
    }

    reportsCount.textContent =
        `${documents.length} published report${documents.length === 1 ? "" : "s"}`;

    reportsList.innerHTML = documents.map(document => `
        <article class="public-report-card">
            <div class="public-report-content">
                <span class="public-report-category">
                    ${escapeHTML(reportCategories[document.category] || "Report")}
                </span>

                <h3>${escapeHTML(document.title)}</h3>

                ${document.reference_number ? `
                    <p class="public-report-reference">
                        Reference No.: ${escapeHTML(document.reference_number)}
                    </p>
                ` : ""}

                ${document.description ? `
                    <p class="public-report-description">
                        ${escapeHTML(document.description)}
                    </p>
                ` : ""}

                <p class="public-report-date">
                    ${escapeHTML(formatDocumentDate(document.document_date))}
                </p>

                <a
                    class="public-report-link"
                    href="${escapeHTML(document.signedUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View PDF
                </a>
            </div>
        </article>
    `).join("");
}

async function loadPublicReports() {
    try {
        const { data, error } = await supabaseClient
            .from("documents")
            .select(`
                id,
                category,
                reference_number,
                title,
                description,
                document_date,
                file_path
            `)
            .eq("is_published", true)
            .in("category", [
                "narrative_report",
                "accomplishment_report",
                "activity_report",
                "financial_report"
            ])
            .order("document_date", {
                ascending: false,
                nullsFirst: false
            })
            .order("created_at", {
                ascending: false
            });

        if (error) throw error;

        const reportsWithLinks = await Promise.all(
            (data || []).map(async document => {
                const { data: signedData, error: signedError } =
                    await supabaseClient.storage
                        .from(DOCUMENT_BUCKET)
                        .createSignedUrl(
                            document.file_path,
                            SIGNED_URL_EXPIRY
                        );

                if (signedError) {
                    console.error(
                        "Could not create signed URL:",
                        document.title,
                        signedError
                    );
                    return null;
                }

                return {
                    ...document,
                    signedUrl: signedData.signedUrl
                };
            })
        );

        const availableReports = reportsWithLinks.filter(Boolean);
        renderReports(availableReports);

    } catch (error) {
        console.error("Error loading public reports:", error);

        reportsCount.textContent = "Unable to load";
        reportsList.innerHTML = `
            <p>Reports could not be loaded. Please try again later.</p>
        `;
    }
}

loadPublicReports();
