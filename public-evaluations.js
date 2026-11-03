
const evaluationContainer = document.getElementById(
  "public-evaluations-list"
);

function showEvaluationMessage(message, isError = false) {
  evaluationContainer.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.className = "public-evaluation-empty";
  paragraph.textContent = message;

  if (isError) {
    paragraph.style.color = "red";
  }

  evaluationContainer.appendChild(paragraph);
}

function createEvaluationCard(evaluation, eventTitles) {
  const card = document.createElement("article");
  card.className = "public-evaluation-card";

  const title = document.createElement("h3");
  title.textContent = evaluation.title || "Event Evaluation";

  const eventLabel = document.createElement("p");
  eventLabel.className = "public-evaluation-event";

  const eventTitle = evaluation.event_id
    ? eventTitles.get(evaluation.event_id) || "Related event"
    : "General evaluation";

  eventLabel.textContent = eventTitle;

  const link = document.createElement("a");
  link.className = "public-evaluation-link";
  link.textContent = "Open Evaluation Form";
  link.href = evaluation.form_url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  card.append(title, eventLabel, link);

  return card;
}

async function loadPublicEvaluations() {
  if (!evaluationContainer) return;

  if (typeof supabaseClient === "undefined") {
    showEvaluationMessage(
      "Unable to connect to the evaluation forms at the moment.",
      true
    );
    return;
  }

  showEvaluationMessage("Loading evaluation forms...");

  const { data: evaluations, error: evaluationError } =
    await supabaseClient
      .from("evaluation_forms")
      .select("id, event_id, title, form_url")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

  if (evaluationError) {
    console.error("Evaluation loading error:", evaluationError);

    showEvaluationMessage(
      "Unable to load evaluation forms. Please try again later.",
      true
    );
    return;
  }

  if (!evaluations || evaluations.length === 0) {
    showEvaluationMessage(
      "There are currently no published evaluation forms. Please check again later."
    );
    return;
  }

  // Retrieve published event titles for linked evaluation forms.
  const { data: events, error: eventsError } = await supabaseClient
    .from("events")
    .select("id, title")
    .eq("is_published", true);

  if (eventsError) {
    console.error("Event title loading error:", eventsError);
  }

  const eventTitles = new Map(
    (events || []).map(event => [event.id, event.title])
  );

  evaluationContainer.replaceChildren();

  evaluations.forEach(evaluation => {
    // Only display valid HTTPS form links.
    try {
      const parsedUrl = new URL(evaluation.form_url);

      if (parsedUrl.protocol !== "https:") return;
    } catch {
      console.warn(
        "Skipping evaluation with an invalid URL:",
        evaluation.id
      );
      return;
    }

    const card = createEvaluationCard(evaluation, eventTitles);
    evaluationContainer.appendChild(card);
  });

  if (evaluationContainer.children.length === 0) {
    showEvaluationMessage(
      "No valid published evaluation forms are currently available."
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    loadPublicEvaluations
  );
} else {
  loadPublicEvaluations();
}
