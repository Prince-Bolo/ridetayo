// functions that many pages use

// checks if someone is logged in, then gets their profile
// if needAdmin is true, riders get sent back to the rides page
async function checkLogin(needAdmin) {
  const { data } = await db.auth.getSession();

  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }

  const userId = data.session.user.id;
  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    alert("Could not load your profile. Please login again.");
    await logout();
    return null;
  }

  if (needAdmin && profile.role !== "admin") {
    alert("Only admins can open this page.");
    window.location.href = "rides.html";
    return null;
  }

  showNav(profile);
  return profile;
}

// top menu bar
function showNav(profile) {
  const nav = document.getElementById("nav");
  if (!nav) return;

  let links = '<a href="rides.html">Rides</a>';
  if (profile.role === "admin") {
    links += '<a href="admin.html">Dashboard</a>';
    links += '<a href="ride-form.html">+ New Ride</a>';
  }

  nav.innerHTML =
    '<a class="brand" href="rides.html">🚲 RideTayo</a>' +
    '<div class="links">' + links +
    '<span class="hello">Hi, ' + clean(profile.full_name) + '</span>' +
    '<button class="btn-small" onclick="logout()">Logout</button>' +
    '</div>';
}

async function logout() {
  await db.auth.signOut();
  window.location.href = "index.html";
}

// stops names like <b>hi</b> from breaking the page
function clean(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 2026-10-25 -> Sun, Oct 25, 2026
function formatDate(dateText) {
  const d = new Date(dateText + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

// 18:30:00 -> 6:30 PM
function formatTime(timeText) {
  const parts = timeText.split(":");
  let hour = parseInt(parts[0]);
  const minute = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return hour + ":" + minute + " " + ampm;
}

// 95 minutes -> 1 hr 35 min
function formatMinutes(mins) {
  if (!mins) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return m + " min";
  return h + " hr " + m + " min";
}

// today's date in the Philippines as YYYY-MM-DD
function todayText() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// gets ?id=5 from the link
function getIdFromLink() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}
