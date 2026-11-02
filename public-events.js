// ==========================================
// ORGHUB - PUBLIC EVENTS INTEGRATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadPublicEvents();
});

async function loadPublicEvents() {
    const eventsList = document.getElementById("events-list");
    const homeEvents = document.getElementById("home-recent-events");
    const eventsCount = document.getElementById("events-count");

    if (!eventsList || typeof supabaseClient === "undefined") {
        console.error("Events container or Supabase client not found.");
        return;
    }

    const { data: events, error } = await supabaseClient
        .from("events")
        .select(`
            id,
            title,
            description,
            location,
            starts_at,
            ends_at,
            status,
            cover_image_path
        `)
        .eq("is_published", true)
        .order("starts_at", { ascending: true });

    if (error) {
        console.error("Error loading public events:", error);
        eventsList.textContent = "Unable to load events right now.";

        if (homeEvents) {
            homeEvents.textContent = "Unable to load recent activities.";
        }

        return;
    }

    if (eventsCount) {
        eventsCount.textContent =
            `${events.length} ${events.length === 1 ? "event" : "events"} logged`;
    }

    renderPublicEvents(events);
    renderRecentEvents(events);
    renderEventCalendar(events);
}


// ==========================================
// DATE FORMATTER
// ==========================================

function formatPublicEventDate(dateValue) {
    if (!dateValue) return "Date to be announced";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date to be announced";
    }

    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}


// ==========================================
// EVENT STATUS
// ==========================================

function getEventStatus(event) {
    const now = new Date();
    const start = event.starts_at ? new Date(event.starts_at) : null;
    const end = event.ends_at ? new Date(event.ends_at) : null;

    // Respect cancellation and completion set by the admin.
    if (event.status === "cancelled") return "Cancelled";
    if (event.status === "completed") return "Completed";

    if (start && now < start) return "Upcoming";

    if (start && now >= start && (!end || now <= end)) {
        return "Ongoing";
    }

    if (end && now > end) return "Completed";

    return event.status || "Upcoming";
}


// ==========================================
// CREATE EVENT ROW
// ==========================================

function createEventRow(event) {
    const row = document.createElement("div");
    row.className = "event-row";

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = formatPublicEventDate(event.starts_at);

    const details = document.createElement("div");
    if (event.cover_image_path) {
    const cover = document.createElement("img");
    cover.src = event.cover_image_path;
    cover.alt = event.title || "Event cover";
    cover.className = "event-cover";
    cover.loading = "lazy";
    details.appendChild(cover);
    }

    const title = document.createElement("p");
    title.className = "title";
    title.textContent = event.title || "Untitled event";

    const description = document.createElement("p");
    description.className = "desc";
    description.textContent = event.description || "No event description available.";

    details.append(title, description);

    if (event.location) {
        const location = document.createElement("p");
        location.className = "desc";
        location.textContent = `Location: ${event.location}`;
        details.appendChild(location);
    }

    const status = document.createElement("span");
    status.className = "tag";

    const statusText = getEventStatus(event);
    status.textContent = statusText;

    if (statusText.toLowerCase() === "upcoming") {
        status.classList.add("upcoming");
    }

    row.append(date, details, status);

    return row;
}


// ==========================================
// RENDER ALL PUBLIC EVENTS
// ==========================================

function renderPublicEvents(events) {
    const container = document.getElementById("events-list");
    if (!container) return;

    container.replaceChildren();

    if (!events.length) {
        const empty = document.createElement("p");
        empty.className = "desc";
        empty.textContent = "No published events yet. Please check back soon.";
        container.appendChild(empty);
        return;
    }

    events.forEach(event => {
        container.appendChild(createEventRow(event));
    });
}


// ==========================================
// HOME PAGE - RECENT EVENTS
// ==========================================

function renderRecentEvents(events) {
    const container = document.getElementById("home-recent-events");
    if (!container) return;

    container.replaceChildren();

    if (!events.length) {
        const empty = document.createElement("p");
        empty.className = "desc";
        empty.textContent = "No recent activities available.";
        container.appendChild(empty);
        return;
    }

    const recentEvents = [...events]
        .sort((a, b) => {
            return new Date(b.starts_at || 0) - new Date(a.starts_at || 0);
        })
        .slice(0, 2);

    recentEvents.forEach(event => {
        container.appendChild(createEventRow(event));
    });
}


// ==========================================
// ACTIVITY CALENDAR
// ==========================================

function renderEventCalendar(events) {
    const calendarBody = document.getElementById("cal-body");
    const monthLabel = document.getElementById("calendar-month");

    if (!calendarBody) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    if (monthLabel) {
        monthLabel.textContent = today.toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric"
        });
    }

    calendarBody.replaceChildren();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get all published events scheduled for this month.
    const eventDays = new Set();

    events.forEach(event => {
        if (!event.starts_at) return;

        const eventDate = new Date(event.starts_at);

        if (
            eventDate.getFullYear() === year &&
            eventDate.getMonth() === month
        ) {
            eventDays.add(eventDate.getDate());
        }
    });

    // Empty calendar cells before the first day.
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "day";
        calendarBody.appendChild(emptyDay);
    }

    // Actual days.
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.className = "day";

        const number = document.createElement("div");
        number.className = "num";
        number.textContent = day;

        dayCell.appendChild(number);

        if (eventDays.has(day)) {
            dayCell.classList.add("has-event");

            const dot = document.createElement("div");
            dot.className = "dot";
            dot.textContent = "event";

            dayCell.appendChild(dot);
        }

        calendarBody.appendChild(dayCell);
    }
}