// ride details page

let me = null;
let ride = null;
let riders = [];
const rideId = getIdFromLink();

async function start() {
  me = await checkLogin(false);
  if (!me) return;

  if (!rideId) {
    alert("No ride selected.");
    window.location.href = "rides.html";
    return;
  }

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  loadRide();
}

async function loadRide() {
  const { data, error } = await db
    .from("rides")
    .select("*")
    .eq("id", rideId)
    .single();

  if (error || !data) {
    document.getElementById("rideBox").innerHTML = '<p class="msg">Ride not found.</p>';
    return;
  }

  ride = data;
  showRideInfo();
  showMap();
  loadWeather();
  loadDaylight();
  loadRiders();
}

function showRideInfo() {
  document.title = "RideTayo - " + ride.title;
  document.getElementById("title").textContent = ride.title;
  document.getElementById("description").textContent = ride.description || "No description.";

  const level = document.getElementById("level");
  level.textContent = ride.difficulty;
  level.className = "tag tag-" + ride.difficulty;

  if (ride.poster_url) {
    const poster = document.getElementById("poster");
    poster.src = ride.poster_url;
    poster.style.display = "block";
  }

  document.getElementById("date").textContent = formatDate(ride.ride_date);
  document.getElementById("time").textContent = formatTime(ride.start_time);
  document.getElementById("place").textContent = ride.meeting_place || "Not set";

  if (ride.distance_km) {
    let distance = ride.distance_km + " km";
    if (ride.is_loop) distance += " (loop)";
    document.getElementById("distance").textContent = distance;
    document.getElementById("duration").textContent = formatMinutes(ride.duration_min);
    document.getElementById("climb").textContent = (ride.climb_m || 0) + " m";
  }

  if (me.role === "admin") {
    document.getElementById("adminTools").innerHTML =
      ' <a class="btn btn-small btn-gray" href="ride-form.html?id=' + ride.id + '">Edit Ride</a>';
  }
}

// ---------- MAP (Leaflet + OpenStreetMap) ----------
function showMap() {
  if (!ride.start_lat) {
    document.getElementById("map").style.display = "none";
    document.getElementById("mapNote").textContent = "The organizer has not set the route yet.";
    return;
  }

  const map = L.map("map").setView([ride.start_lat, ride.start_lng], 14);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // the saved route line from OpenRouteService
  if (ride.route_points && ride.route_points.length > 0) {
    const line = L.polyline(ride.route_points, { color: "#ef6c00", weight: 5 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [30, 30] });
  }

  if (ride.end_lat) {
    L.circleMarker([ride.end_lat, ride.end_lng], {
      radius: 9, color: "white", fillColor: "#c62828", fillOpacity: 1
    }).addTo(map).bindPopup(ride.is_loop ? "Turnaround point" : "Finish");
  }

  L.circleMarker([ride.start_lat, ride.start_lng], {
    radius: 9, color: "white", fillColor: "#2e7d32", fillOpacity: 1
  }).addTo(map).bindPopup("Start: " + clean(ride.meeting_place));
}

// ---------- WEATHER (Open-Meteo) ----------
async function loadWeather() {
  const box = document.getElementById("weather");

  if (!ride.start_lat) {
    box.innerHTML = '<p class="muted">No start point yet, so no weather.</p>';
    return;
  }

  const daysAway = daysUntil(ride.ride_date);
  if (daysAway < 0) {
    box.innerHTML = '<p class="muted">This ride is already done.</p>';
    return;
  }
  if (daysAway > 15) {
    box.innerHTML = '<p class="muted">The forecast will show 16 days before the ride. ' +
      daysAway + ' days to go!</p>';
    return;
  }

  const url = "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + ride.start_lat +
    "&longitude=" + ride.start_lng +
    "&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m" +
    "&timezone=Asia%2FManila" +
    "&start_date=" + ride.ride_date +
    "&end_date=" + ride.ride_date;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.reason);
    }

    // find the hour when the ride starts, ex. 2026-10-25T18:00
    const hour = ride.start_time.substring(0, 2);
    const index = data.hourly.time.indexOf(ride.ride_date + "T" + hour + ":00");
    if (index === -1) {
      box.innerHTML = '<p class="muted">No forecast for that hour yet.</p>';
      return;
    }

    const temp = data.hourly.temperature_2m[index];
    const code = data.hourly.weather_code[index];
    const wind = data.hourly.wind_speed_10m[index];
    let rain = data.hourly.precipitation_probability[index];
    if (rain === null) rain = 0;

    let advice = "Good weather for riding!";
    if (rain >= 60) {
      advice = "High chance of rain. Bring a raincoat and watch for updates from the organizer.";
    } else if (rain >= 30) {
      advice = "It might rain. Bring a raincoat just in case.";
    }

    box.innerHTML =
      '<p style="font-size: 22px; margin: 0;">' + weatherText(code) + '</p>' +
      '<p>🌡️ ' + temp + '°C &nbsp; 🌧️ ' + rain + '% rain &nbsp; 💨 ' + wind + ' km/h wind</p>' +
      '<div class="note">' + advice + '</div>' +
      '<p class="muted"><small>Forecast at ' + formatTime(ride.start_time) + ' from Open-Meteo</small></p>';
  } catch (err) {
    console.log("Weather error:", err);
    box.innerHTML = '<p class="msg">Could not load the weather right now.</p>';
  }
}

// weather codes from Open-Meteo to words
function weatherText(code) {
  if (code === 0) return "☀️ Clear sky";
  if (code <= 2) return "🌤️ Partly cloudy";
  if (code === 3) return "☁️ Cloudy";
  if (code === 45 || code === 48) return "🌫️ Foggy";
  if (code >= 51 && code <= 57) return "🌦️ Drizzle";
  if (code >= 61 && code <= 67) return "🌧️ Rain";
  if (code >= 80 && code <= 82) return "🌧️ Rain showers";
  if (code >= 95) return "⛈️ Thunderstorm";
  return "Weather code " + code;
}

function daysUntil(dateText) {
  const today = new Date(todayText() + "T00:00:00");
  const day = new Date(dateText + "T00:00:00");
  return Math.round((day - today) / 86400000);
}

// ---------- SUNRISE / SUNSET (Sunrise-Sunset.org) ----------
async function loadDaylight() {
  const box = document.getElementById("sunset");

  if (!ride.start_lat) {
    box.innerHTML = '<p class="muted">No start point yet.</p>';
    return;
  }

  const url = "https://api.sunrise-sunset.org/json" +
    "?lat=" + ride.start_lat +
    "&lng=" + ride.start_lng +
    "&date=" + ride.ride_date +
    "&formatted=0";

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK") {
      throw new Error(data.status);
    }

    // the API gives UTC time, we show it in Philippine time
    const sunrise = new Date(data.results.sunrise);
    const sunset = new Date(data.results.sunset);
    const rideStart = new Date(ride.ride_date + "T" + ride.start_time + "+08:00");
    const rideEnd = new Date(rideStart.getTime() + (ride.duration_min || 0) * 60000);

    let advice = "☀️ You should finish before it gets dark.";
    if (rideStart < sunrise) {
      advice = "🌙 You start before sunrise. Bring front and rear lights.";
    } else if (rideStart >= sunset) {
      advice = "🌙 This is a night ride. Front and rear lights are required.";
    } else if (rideEnd > sunset) {
      advice = "🔦 The ride will end after sunset. Bring your lights.";
    }

    box.innerHTML =
      '<p style="font-size: 22px; margin: 0;">🌇 Sunset at ' + phTime(sunset) + '</p>' +
      '<p>🌅 Sunrise: ' + phTime(sunrise) + ' &nbsp; 🏁 Est. finish: ' + phTime(rideEnd) + '</p>' +
      '<div class="note">' + advice + '</div>' +
      '<p class="muted"><small>From Sunrise-Sunset.org</small></p>';
  } catch (err) {
    console.log("Sunset error:", err);
    box.innerHTML = '<p class="msg">Could not load sunset time right now.</p>';
  }
}

function phTime(dateObj) {
  return dateObj.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila"
  });
}

// ---------- RIDERS + JOIN ----------
async function loadRiders() {
  const list = document.getElementById("riderList");

  const { data, error } = await db
    .from("ride_joins")
    .select("id, rider_id, joined_at, profiles(full_name)")
    .eq("ride_id", rideId)
    .order("joined_at", { ascending: true });

  if (error) {
    list.innerHTML = '<li class="msg">Error: ' + clean(error.message) + '</li>';
    return;
  }

  riders = data;
  document.getElementById("riderCount").textContent = riders.length + " / " + ride.max_riders;

  if (riders.length === 0) {
    list.innerHTML = '<li class="muted">No riders yet. Be the first!</li>';
  } else {
    let html = "";
    riders.forEach(function (r, i) {
      let name = r.profiles ? r.profiles.full_name : "Unknown rider";
      if (r.rider_id === me.id) name += " (you)";

      let removeBtn = "";
      if (me.role === "admin") {
        removeBtn = '<button class="btn-small btn-red" onclick="removeRider(' + r.id + ')">Remove</button>';
      }

      html += '<li><span>' + (i + 1) + '. ' + clean(name) + '</span>' + removeBtn + '</li>';
    });
    list.innerHTML = html;
  }

  showJoinButton();
}

function showJoinButton() {
  const area = document.getElementById("joinArea");

  const alreadyJoined = riders.some(function (r) {
    return r.rider_id === me.id;
  });

  if (ride.ride_date < todayText()) {
    area.innerHTML = '<button disabled>This ride is done</button>';
  } else if (alreadyJoined) {
    area.innerHTML = '<p>✅ You joined this ride. See you there!</p>' +
      '<button class="btn-gray" onclick="leaveRide()">Leave Ride</button>';
  } else if (riders.length >= ride.max_riders) {
    area.innerHTML = '<button disabled>Ride is full</button>';
  } else {
    area.innerHTML = '<button class="btn-green" onclick="joinRide()">Join This Ride</button>';
  }
}

async function joinRide() {
  document.getElementById("joinArea").innerHTML = '<p class="muted">Joining...</p>';

  const { error } = await db
    .from("ride_joins")
    .insert({ ride_id: ride.id, rider_id: me.id });

  if (error) {
    alert("Could not join: " + error.message);
    loadRiders();
    return;
  }

  sendJoinEmail();
  loadRiders();
}

// ---------- EMAIL (EmailJS) ----------
async function sendJoinEmail() {
  const note = document.getElementById("emailNote");
  note.textContent = "Sending you an email...";

  try {
    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_name: me.full_name,
      to_email: me.email,
      ride_title: ride.title,
      ride_date: formatDate(ride.ride_date),
      ride_time: formatTime(ride.start_time),
      meeting_place: ride.meeting_place || "See the app",
      distance: ride.distance_km ? ride.distance_km + " km" : "To be announced",
      ride_link: window.location.href
    });
    note.textContent = "📧 Ride details were sent to " + me.email;
  } catch (err) {
    console.log("Email error:", err);
    note.textContent = "You joined, but the email could not be sent.";
  }
}

async function leaveRide() {
  if (!confirm("Leave this ride?")) return;

  const { error } = await db
    .from("ride_joins")
    .delete()
    .eq("ride_id", ride.id)
    .eq("rider_id", me.id);

  if (error) {
    alert("Could not leave: " + error.message);
  }
  document.getElementById("emailNote").textContent = "";
  loadRiders();
}

// admin only
async function removeRider(joinId) {
  if (!confirm("Remove this rider from the ride?")) return;

  const { error } = await db
    .from("ride_joins")
    .delete()
    .eq("id", joinId);

  if (error) {
    alert("Could not remove: " + error.message);
  }
  loadRiders();
}

start();
