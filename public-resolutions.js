
const RESOLUTION_BUCKET = "orghub-documents";
const RESOLUTION_URL_EXPIRY = 600; // 10 minutes

const resolutionsList = document.getElementById("resolutions-list");
const resolutionsCount = document.getElementById("resolutions-count");

function escapeResolutionHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatResolutionDate(dateValue) {
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

function renderResolutions(resolutions) {
    if (!resolutions.length) {
        resolutionsCount.textContent = "0 resolutions";
        resolutionsList.innerHTML = `
            <p>No published resolutions are available yet.</p>
        `;
        return;
    }

    resolutionsCount.textContent =
        `${resolutions.length} published resolution${resolutions.length === 1 ? "" : "s"}`;

    resolutionsList.innerHTML = resolutions.map(resolution => `
        <article class="public-resolution-card">
            <div class="public-resolution-content">
                <span class="public-resolution-category">
                    Official Resolution
                </span>

                <h3>${escapeResolutionHTML(resolution.title)}</h3>

                ${resolution.reference_number ? `
                    <p class="public-resolution-reference">
                        Resolution No.: ${escapeResolutionHTML(resolution.reference_number)}
                    </p>
                ` : ""}

                ${resolution.description ? `
                    <p class="public-resolution-description">
                        ${escapeResolutionHTML(resolution.description)}
                    </p>
                ` : ""}

                <p class="public-resolution-date">
                    ${escapeResolutionHTML(formatResolutionDate(resolution.document_date))}
                </p>

                <a
                    class="public-resolution-link"
                    href="${escapeResolutionHTML(resolution.signedUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View Resolution PDF
                </a>
            </div>
        </article>
    `).join("");
}

async function loadPublicResolutions() {
    try {
        const { data, error } = await supabaseClient
            .from("documents")
            .select(`
                id,
                reference_number,
                title,
                description,
                document_date,
                file_path
            `)
            .eq("category", "resolution")
            .eq("is_published", true)
            .order("document_date", {
                ascending: false,
                nullsFirst: false
            })
            .order("created_at", {
                ascending: false
            });

        if (error) throw error;

        const resolutionsWithLinks = await Promise.all(
            (data || []).map(async resolution => {
                const { data: signedData, error: signedError } =
                    await supabaseClient.storage
                        .from(RESOLUTION_BUCKET)
                        .createSignedUrl(
                            resolution.file_path,
                            RESOLUTION_URL_EXPIRY
                        );

                if (signedError) {
                    console.error(
                        "Could not create resolution PDF link:",
                        resolution.title,
                        signedError
                    );
                    return null;
                }

                return {
                    ...resolution,
                    signedUrl: signedData.signedUrl
                };
            })
        );

        renderResolutions(resolutionsWithLinks.filter(Boolean));

    } catch (error) {
        console.error("Error loading public resolutions:", error);

        resolutionsCount.textContent = "Unable to load";
        resolutionsList.innerHTML = `
            <p>Resolutions could not be loaded. Please try again later.</p>
        `;
    }
}

loadPublicResolutions();
