async function loadPublicSiteSettings() {
    try {
        const { data, error } = await supabaseClient
            .from("site_settings")
            .select("setting_key, setting_value");

        if (error) {
            console.error("Unable to load public site settings:", error);
            startHomepageTypewriter();
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

        // Run once after the final homepage copy (including Supabase values) is ready.
        startHomepageTypewriter();

    } catch (error) {
        console.error("Public settings error:", error);
        startHomepageTypewriter();
    }
}

/*
 * Typewriter effect runs once per page load for the homepage headline
 * and description. It does not run again when users navigate between views.
 */
function startHomepageTypewriter() {
    const headline = document.querySelector('[data-site-setting="homepage_headline"]');
    const description = document.querySelector('[data-site-setting="homepage_description"]');

    if (!headline || !description || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const headlineText = headline.textContent.trim();
    const descriptionText = description.textContent.trim();

    function typeText(element, fullText, speed, done) {
        const characters = Array.from(fullText);
        let index = 0;

        element.setAttribute("aria-label", fullText);
        element.textContent = "";
        element.classList.add("typewriter-active");

        function typeNextCharacter() {
            if (index < characters.length) {
                element.textContent += characters[index];
                index += 1;
                window.setTimeout(typeNextCharacter, speed);
            } else {
                element.classList.remove("typewriter-active");
                element.classList.add("typewriter-done");
                if (typeof done === "function") done();
            }
        }

        typeNextCharacter();
    }

    // Headline first, followed by the supporting description.
    typeText(headline, headlineText, 42, () => {
        window.setTimeout(() => {
            typeText(description, descriptionText, 18);
        }, 180);
    });
}

loadPublicSiteSettings();
