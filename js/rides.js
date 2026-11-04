// rides page (what riders see after login)

let me = null;
let allRides = [];

async function start() {
  me = await checkLogin(false);
  if (!me) return;

  loadRides();
  loadMyRides();
}

// get all rides from today onwards, with how many joined
async function loadRides() {
  const cards = document.getElementById("rideCards");
  cards.innerHTML = '<p class="muted">Loading rides...</p>';

  const { data, error } = await db
    .from("rides")
    .select("*, ride_joins(count)")
    .gte("ride_date", todayText())
    .order("ride_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    cards.innerHTML = '<p class="msg">Error: ' + clean(error.message) + '</p>';
    return;
  }

  allRides = data;
  showRides();
}

// show the rides that match the search box and level filter
function showRides() {
  const search = document.getElementById("search").value.toLowerCase();
  const level = document.getElementById("levelFilter").value;
  const cards = document.getElementById("rideCards");

  const list = allRides.filter(function (ride) {
    const text = (ride.title + " " + (ride.meeting_place || "")).toLowerCase();
    const matchText = text.includes(search);
    const matchLevel = level === "All" || ride.difficulty === level;
    return matchText && matchLevel;
  });

  if (list.length === 0) {
    cards.innerHTML = '<p class="muted">No upcoming rides found.</p>';
    return;
  }

  let html = "";
  list.forEach(function (ride) {
    html += rideCard(ride);
  });
  cards.innerHTML = html;
}

function rideCard(ride) {
  let joined = 0;
  if (ride.ride_joins && ride.ride_joins.length > 0) {
    joined = ride.ride_joins[0].count;
  }

  const poster = '<div class="poster-empty">🚴</div>';

  let distance = "Route not set yet";
  if (ride.distance_km) {
    distance = ride.distance_km + " km";
  }

  return '<div class="card">' + poster +
    '<div class="card-body">' +
    '<h3>' + clean(ride.title) + '</h3>' +
    '<p><span class="tag tag-' + clean(ride.difficulty) + '">' + clean(ride.difficulty) + '</span></p>' +
    '<p>📅 ' + formatDate(ride.ride_date) + ' at ' + formatTime(ride.start_time) + '</p>' +
    '<p>📍 ' + clean(ride.meeting_place || "Meeting place not set") + '</p>' +
    '<p>🛣️ ' + distance + '</p>' +
    '<p>👥 ' + joined + ' / ' + ride.max_riders + ' riders</p>' +
    '<br><a class="btn" href="ride.html?id=' + ride.id + '">View Ride</a>' +
    '</div></div>';
}

// rides that I joined
async function loadMyRides() {
  const box = document.getElementById("myRides");

  const { data, error } = await db
    .from("ride_joins")
    .select("ride_id, rides(id, title, ride_date, start_time)")
    .eq("rider_id", me.id);

  if (error) {
    box.innerHTML = '<li class="msg">Error: ' + clean(error.message) + '</li>';
    return;
  }

  // remove empty ones and put the latest date on top
  const list = data.filter(function (j) {
    return j.rides !== null;
  });
  list.sort(function (a, b) {
    return b.rides.ride_date.localeCompare(a.rides.ride_date);
  });

  if (list.length === 0) {
    box.innerHTML = '<li class="muted">You have not joined any ride yet.</li>';
    return;
  }

  let html = "";
  list.forEach(function (j) {
    const ride = j.rides;
    const done = ride.ride_date < todayText();
    html += '<li>' +
      '<span><b>' + clean(ride.title) + '</b><br>' +
      '<small class="muted">' + formatDate(ride.ride_date) + ' at ' + formatTime(ride.start_time) +
      (done ? ' (done)' : '') + '</small></span>' +
      '<a class="btn btn-small btn-green" href="ride.html?id=' + ride.id + '">View</a>' +
      '</li>';
  });
  box.innerHTML = html;
}

document.getElementById("search").addEventListener("input", showRides);
document.getElementById("levelFilter").addEventListener("change", showRides);

start();
