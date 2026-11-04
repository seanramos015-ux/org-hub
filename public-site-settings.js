
async function loadPublicSiteSettings() {
    try {
        const { data, error } = await supabaseClient
            .from("site_settings")
            .select("setting_key, setting_value");

        if (error) {
            console.error("Unable to load public site settings:", error);
            return;
        }

        const settings = {};

        data.forEach(item => {
            settings[item.setting_key] = item.setting_value;
        });

        document.querySelectorAll("[data-site-setting]").forEach(element => {
            const key = element.dataset.siteSetting;

            if (
                Object.prototype.hasOwnProperty.call(settings, key) &&
                typeof settings[key] === "string"
            ) {
                element.textContent = settings[key];
            }
        });

        // Update browser tab title.
        if (settings.organization_name) {
            document.title = settings.organization_name;
        }

    } catch (error) {
        console.error("Public settings error:", error);
    }
}

loadPublicSiteSettings();
