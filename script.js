// script.js
// Intel Sustainability Summit Check-In logic (v2)
// New in v2:
// - Celebration banner when goal is reached
// - Persistent attendee list (name + team) via localStorage
// - Attendee list rendering beneath team counters

(function () {
  const GOAL = 50; // <-- change your attendance goal here

  // --- Element hooks (these IDs should match your HTML) ---
  const elGreeting = document.getElementById("greeting");
  const elAttendeeCount = document.getElementById("attendeeCount");
  const elProgressBar = document.getElementById("progressBar");

  const elWater = document.getElementById("waterCount");
  const elZero = document.getElementById("zeroCount");
  const elPower = document.getElementById("powerCount");

  const form = document.getElementById("checkInForm");
  const nameInput = document.getElementById("attendeeName");
  const teamSelect = document.getElementById("teamSelect");

  // Optional container for attendee list. If it doesn't exist, we'll create it.
  let elAttendeeList = document.getElementById("attendeeList");

  // Create a celebration container (toast/banner) if none exists
  let elCelebration = document.getElementById("celebration");
  if (!elCelebration) {
    elCelebration = document.createElement("div");
    elCelebration.id = "celebration";
    elCelebration.style.display = "none";
    elCelebration.style.position = "fixed";
    elCelebration.style.left = "50%";
    elCelebration.style.top = "24px";
    elCelebration.style.transform = "translateX(-50%)";
    elCelebration.style.padding = "14px 18px";
    elCelebration.style.borderRadius = "12px";
    elCelebration.style.background = "#16a34a";
    elCelebration.style.color = "white";
    elCelebration.style.fontWeight = "600";
    elCelebration.style.boxShadow = "0 10px 24px rgba(0,0,0,0.25)";
    elCelebration.style.zIndex = "9999";
    document.body.appendChild(elCelebration);
  }

  // If attendee list container is missing, create one right after the team counters area
  if (!elAttendeeList) {
    elAttendeeList = document.createElement("div");
    elAttendeeList.id = "attendeeList";
    elAttendeeList.style.marginTop = "1rem";

    // Try to insert after the counters region
    const countersAnchor =
      elPower?.closest(".card, .panel, section, .container") ||
      elPower?.parentElement?.parentElement ||
      elAttendeeCount?.closest(".card, .panel, section, .container") ||
      document.body;

    countersAnchor.appendChild(elAttendeeList);
  }

  const TEAM_LABEL = {
    water: "Team Water Wise",
    zero: "Team Net Zero",
    power: "Team Renewables",
  };

  // --- Persistence helpers ---
  const STORAGE_KEY = "attendanceState-v2";

  function coerceNumber(n, fallback = 0) {
    const v = Number(n);
    return Number.isFinite(v) ? v : fallback;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Default shape
        return {
          total: 0,
          teams: { water: 0, zero: 0, power: 0 },
          attendees: [], // { name, team, ts }
          goalCelebrated: false,
        };
      }
      const parsed = JSON.parse(raw);
      return {
        total: coerceNumber(parsed.total, 0),
        teams: {
          water: coerceNumber(parsed?.teams?.water, 0),
          zero: coerceNumber(parsed?.teams?.zero, 0),
          power: coerceNumber(parsed?.teams?.power, 0),
        },
        attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
        goalCelebrated: Boolean(parsed.goalCelebrated),
      };
    } catch {
      return {
        total: 0,
        teams: { water: 0, zero: 0, power: 0 },
        attendees: [],
        goalCelebrated: false,
      };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  // --- UI updates ---
  function updateCountsUI() {
    elAttendeeCount.textContent = state.total;
    elWater.textContent = state.teams.water;
    elZero.textContent = state.teams.zero;
    elPower.textContent = state.teams.power;

    const pct = Math.min((state.total / GOAL) * 100, 100);
    elProgressBar.style.width = pct + "%";
    elProgressBar.setAttribute("aria-valuenow", String(Math.round(pct)));
    elProgressBar.setAttribute("role", "progressbar");
    elProgressBar.setAttribute("aria-label", "Attendance progress");
    elProgressBar.title = `${Math.round(pct)}% of goal reached`;
  }

  function renderAttendeesUI() {
    // Clear and rebuild list
    elAttendeeList.innerHTML = "";

    // Optional: section header that matches common designs
    const header = document.createElement("h3");
    header.textContent = "Attendee List";
    header.style.margin = "0 0 .5rem 0";
    elAttendeeList.appendChild(header);

    if (!state.attendees.length) {
      const empty = document.createElement("p");
      empty.textContent = "No attendees checked in yet.";
      empty.style.opacity = "0.8";
      elAttendeeList.appendChild(empty);
      return;
    }

    // A simple, design-friendly list
    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";

    state.attendees.forEach((a) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.justifyContent = "space-between";
      li.style.gap = "1rem";
      li.style.padding = ".5rem .75rem";
      li.style.borderRadius = "10px";
      li.style.border = "1px solid rgba(0,0,0,0.08)";
      li.style.background = "rgba(0,0,0,0.03)";
      li.style.marginBottom = ".5rem";

      const left = document.createElement("div");
      left.style.fontWeight = "600";
      left.textContent = a.name;

      const right = document.createElement("div");
      right.style.opacity = "0.9";
      right.textContent = TEAM_LABEL[a.team] || "—";

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });

    elAttendeeList.appendChild(list);
  }

  function showGreeting(name, teamKey) {
    const teamLabel = TEAM_LABEL[teamKey] || "the event";
    elGreeting.textContent = `Welcome, ${name}! Thanks for checking in with ${teamLabel}.`;
    elGreeting.classList.add("success-message");
    elGreeting.style.display = "block";

    // Auto-hide after a few seconds
    window.clearTimeout(showGreeting._hideTimer);
    showGreeting._hideTimer = window.setTimeout(() => {
      elGreeting.style.display = "none";
    }, 4000);
  }

  function celebrateIfGoalReached() {
    if (state.total < GOAL || state.goalCelebrated) return;

    // Determine winner(s)
    const counts = state.teams;
    const max = Math.max(counts.water, counts.zero, counts.power);

    const winners = Object.entries(counts)
      .filter(([, v]) => v === max)
      .map(([k]) => TEAM_LABEL[k]);

    const text =
      winners.length === 1
        ? `🎉 Goal reached! ${winners[0]} leads with ${max} attendee${
            max === 1 ? "" : "s"
          }!`
        : `🎉 Goal reached! It's a tie between ${winners.join(
            " and "
          )} (${max} each)!`;

    elCelebration.textContent = text;
    elCelebration.style.display = "block";

    // Auto-hide banner after 6s (click to dismiss sooner)
    window.clearTimeout(celebrateIfGoalReached._hideTimer);
    celebrateIfGoalReached._hideTimer = window.setTimeout(() => {
      elCelebration.style.display = "none";
    }, 6000);

    elCelebration.onclick = () => {
      elCelebration.style.display = "none";
    };

    state.goalCelebrated = true;
    saveState();
  }

  function addAttendee(name, teamKey) {
    // Update counters
    state.total += 1;
    if (state.teams[teamKey] != null) {
      state.teams[teamKey] += 1;
    }

    // Add to attendee list (persisted)
    state.attendees.push({
      name,
      team: teamKey,
      ts: Date.now(),
    });

    // Persist + UI
    saveState();
    updateCountsUI();
    renderAttendeesUI();
    showGreeting(name, teamKey);
    celebrateIfGoalReached();
  }

  // --- Initialize UI on load ---
  updateCountsUI();
  renderAttendeesUI();
  celebrateIfGoalReached();

  // --- Form handler ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const rawName = (nameInput.value || "").trim();
    const teamKey = teamSelect.value;

    if (!rawName || !teamKey) return;

    addAttendee(rawName, teamKey);

    // Reset inputs for the next attendee
    nameInput.value = "";
    teamSelect.value = "";
    nameInput.focus();
  });
})();
