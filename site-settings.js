
const settingKeys = [
    "organization_name",
    "academic_year",
    "homepage_headline",
    "homepage_description",
    "mission",
    "vision"
];

const form = document.getElementById("settings-form");
const saveButton = document.getElementById("save-settings");
const resetButton = document.getElementById("reset-settings");
const statusMessage = document.getElementById("status-message");
const lastUpdated = document.getElementById("last-updated");

let originalSettings = {};

function showMessage(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

function setLoading(isLoading) {
    saveButton.disabled = isLoading;
    resetButton.disabled = isLoading;

    saveButton.textContent = isLoading
        ? "Please wait..."
        : "Save Changes";
}

function formatDate(dateString) {
    if (!dateString) return "Not available";

    return new Date(dateString).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

// Check the current session and verify admin authorization.
async function verifyAdmin() {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.href = "admin-login.html";
        return false;
    }

    const { data: isAdmin, error: adminError } =
        await supabaseClient.rpc("is_org_admin");

    if (adminError || !isAdmin) {
        await supabaseClient.auth.signOut();
        alert("Unauthorized access. Please log in with an authorized admin account.");
        window.location.href = "admin-login.html";
        return false;
    }

    return true;
}

// Load settings from Supabase.
async function loadSettings() {
    showMessage("Loading site settings...");

    const { data, error } = await supabaseClient
        .from("site_settings")
        .select("setting_key, setting_value, updated_at");

    if (error) {
        console.error("Settings loading error:", error);
        showMessage("Unable to load settings: " + error.message, "error");
        return;
    }

    originalSettings = {};

    data.forEach(setting => {
        originalSettings[setting.setting_key] = {
            value: setting.setting_value,
            updated_at: setting.updated_at
        };
    });

    settingKeys.forEach(key => {
        const input = document.getElementById(key);
        const savedValue = originalSettings[key]?.value;

        // Values are stored as JSONB strings.
        input.value = typeof savedValue === "string"
            ? savedValue
            : "";
    });

    const dates = data
        .map(setting => setting.updated_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a));

    lastUpdated.textContent = dates.length
        ? "Last updated: " + formatDate(dates[0])
        : "Last updated: Not available";

    showMessage("Settings loaded successfully.", "success");
}

// Save all six settings.
async function saveSettings(event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const confirmed = confirm(
        "Are you sure you want to save these site settings?"
    );

    if (!confirmed) return;

    setLoading(true);
    showMessage("Saving changes...");

    const updates = settingKeys.map(key => ({
        setting_key: key,
        setting_value: document.getElementById(key).value
    }));

    const { error } = await supabaseClient
        .from("site_settings")
        .upsert(updates, {
            onConflict: "setting_key"
        });

    if (error) {
        console.error("Settings save error:", error);
        showMessage("Failed to save settings: " + error.message, "error");
        setLoading(false);
        return;
    }

    showMessage("Site settings saved successfully!", "success");

    await loadSettings();
    setLoading(false);
}

// Restore the last saved values from Supabase.
async function resetSettings() {
    const confirmed = confirm(
        "Discard your unsaved changes and reload the saved settings?"
    );

    if (!confirmed) return;

    await loadSettings();
}

// Initialize the page.
async function initializeSettingsPage() {
    try {
        if (typeof supabaseClient === "undefined") {
            showMessage(
                "Supabase client not found. Check supabase-config.js.",
                "error"
            );
            return;
        }

        const authorized = await verifyAdmin();

        if (!authorized) return;

        await loadSettings();

    } catch (error) {
        console.error("Initialization error:", error);
        showMessage("An unexpected error occurred: " + error.message, "error");
    }
}

form.addEventListener("submit", saveSettings);
resetButton.addEventListener("click", resetSettings);

initializeSettingsPage();
