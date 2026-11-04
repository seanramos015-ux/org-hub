
async function loadChapterSnapshot() {
    const officerCount = document.getElementById("snapshot-officers");
    const activityCount = document.getElementById("snapshot-activities");
    const resolutionCount = document.getElementById("snapshot-resolutions");
    const reportCount = document.getElementById("snapshot-reports");

    try {
        const [
            officers,
            activities,
            resolutions,
            reports
        ] = await Promise.all([

            // Count published officers
            supabaseClient
                .from("officers")
                .select("*", { count: "exact", head: true })
                .eq("is_published", true),

            // Count published, non-cancelled activities
            supabaseClient
                .from("events")
                .select("*", { count: "exact", head: true })
                .eq("is_published", true)
                .neq("status", "cancelled"),

            // Count published resolutions
            supabaseClient
                .from("documents")
                .select("*", { count: "exact", head: true })
                .eq("is_published", true)
                .eq("category", "resolution"),

            // Count published transparency/report documents
            supabaseClient
                .from("documents")
                .select("*", { count: "exact", head: true })
                .eq("is_published", true)
                .in("category", [
                    "narrative_report",
                    "financial_report",
                    "accomplishment_report",
                    "activity_report"
                ])
        ]);

        // Check for database errors
        if (officers.error) throw officers.error;
        if (activities.error) throw activities.error;
        if (resolutions.error) throw resolutions.error;
        if (reports.error) throw reports.error;

        // Display the actual counts
        officerCount.textContent = officers.count ?? 0;
        activityCount.textContent = activities.count ?? 0;
        resolutionCount.textContent = resolutions.count ?? 0;
        reportCount.textContent = reports.count ?? 0;

    } catch (error) {
        console.error("Chapter snapshot loading error:", error);

        officerCount.textContent = "—";
        activityCount.textContent = "—";
        resolutionCount.textContent = "—";
        reportCount.textContent = "—";
    }
}

loadChapterSnapshot();
