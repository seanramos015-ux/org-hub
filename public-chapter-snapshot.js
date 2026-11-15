function animateSnapshotCount(element, targetValue) {
    const target = Math.max(0, Number(targetValue) || 0);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || target === 0) {
        element.textContent = target.toLocaleString();
        return;
    }

    const duration = 1200;
    const startTime = performance.now();

    function updateCount(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * easedProgress);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCount);
        } else {
            element.textContent = target.toLocaleString();
        }
    }

    element.textContent = "0";
    requestAnimationFrame(updateCount);
}


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

        // Animate each live database count from zero to its final value.
        animateSnapshotCount(officerCount, officers.count ?? 0);
        animateSnapshotCount(activityCount, activities.count ?? 0);
        animateSnapshotCount(resolutionCount, resolutions.count ?? 0);
        animateSnapshotCount(reportCount, reports.count ?? 0);

    } catch (error) {
        console.error("Chapter snapshot loading error:", error);

        officerCount.textContent = "—";
        activityCount.textContent = "—";
        resolutionCount.textContent = "—";
        reportCount.textContent = "—";
    }
}

loadChapterSnapshot();
