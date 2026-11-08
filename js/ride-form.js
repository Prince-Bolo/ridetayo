// add / edit ride page (admin only)

let me = null;
const editId = getIdFromLink(); // if there is an id, we are editing

let map = null;
let startPoint = null;
let endPoint = null;
let startMarker = null;
let endMarker = null;
let routeLine = null;

// route results from OpenRouteService
let routePoints = null;
let distanceKm = null;
let durationMin = null;
let climbM = null;

async function start() {
  me = await checkLogin(true);
  if (!me) return;

  setupMap();

  if (editId) {
    loadRideToEdit();
  }
}

// ---------- MAP (Leaflet + OpenStreetMap) ----------
function setupMap() {
  // center of Iligan City
  map = L.map("map").setView([8.228, 124.245], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.on("click", function (e) {
    const mode = document.querySelector('input[name="pointMode"]:checked').value;

    if (mode === "start") {
      setStart(e.latlng.lat, e.latlng.lng);
      findPlaceName(e.latlng.lat, e.latlng.lng);
      // next click will set the end point
      document.getElementById("modeEnd").checked = true;
    } else {
      setEnd(e.latlng.lat, e.latlng.lng);
    }
  });
}

function setStart(lat, lng) {
  startPoint = { lat: lat, lng: lng };
  if (startMarker) map.removeLayer(startMarker);
  startMarker = L.circleMarker([lat, lng], {
    radius: 9, color: "white", fillColor: "#2e7d32", fillOpacity: 1
  }).addTo(map).bindPopup("Start");
  clearRoute();
}

function setEnd(lat, lng) {
  endPoint = { lat: lat, lng: lng };
  if (endMarker) map.removeLayer(endMarker);
  endMarker = L.circleMarker([lat, lng], {
    radius: 9, color: "white", fillColor: "#c62828", fillOpacity: 1
  }).addTo(map).bindPopup("End / Turnaround");
  clearRoute();
}

// when points change, the old route is not correct anymore
function clearRoute() {
  if (routeLine) map.removeLayer(routeLine);
  routeLine = null;
  routePoints = null;
  distanceKm = null;
  durationMin = null;
  climbM = null;
  document.getElementById("routeInfo").textContent = "Set the start and end points, then click Get Route.";
}

function clearPoints() {
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);
  startMarker = null;
  endMarker = null;
  startPoint = null;
  endPoint = null;
  clearRoute();
  document.getElementById("modeStart").checked = true;
}

document.getElementById("isLoop").addEventListener("change", clearRoute);

// ---------- PLACE SEARCH (Nominatim) ----------
async function searchPlace() {
  const text = document.getElementById("meetingPlace").value.trim();
  const status = document.getElementById("searchStatus");

  if (text === "") {
    alert("Type a place first, ex. Iligan City Hall");
    return;
  }

  status.textContent = "Searching...";

  // viewbox keeps the results near Iligan
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1" +
    "&countrycodes=ph&viewbox=124.10,8.40,124.50,8.05" +
    "&q=" + encodeURIComponent(text);

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.length === 0) {
      status.textContent = "Place not found. Try another name or just click the map.";
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    setStart(lat, lng);
    map.setView([lat, lng], 15);
    document.getElementById("modeEnd").checked = true;
    status.textContent = "Found: " + shortName(data[0].display_name) + ". Now click the map for the end point.";
  } catch (err) {
    console.log("Search error:", err);
    status.textContent = "Search failed. Check your internet.";
  }
}

// pressing Enter in the meeting place box searches instead of saving the form
document.getElementById("meetingPlace").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    searchPlace();
  }
});

// map click -> place name
async function findPlaceName(lat, lng) {
  const url = "https://nominatim.openstreetmap.org/reverse?format=json&zoom=18" +
    "&lat=" + lat + "&lon=" + lng;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.display_name) {
      document.getElementById("meetingPlace").value = shortName(data.display_name);
    }
  } catch (err) {
    console.log("Reverse search error:", err);
  }
}

// keep only the first 3 parts of a long address
function shortName(fullName) {
  return fullName.split(", ").slice(0, 3).join(", ");
}

// ---------- BIKE ROUTE (OpenRouteService) ----------
async function getRoute() {
  const info = document.getElementById("routeInfo");

  if (!startPoint || !endPoint) {
    alert("Set the START and END points on the map first.");
    return;
  }

  // ORS wants [longitude, latitude]
  const coords = [
    [startPoint.lng, startPoint.lat],
    [endPoint.lng, endPoint.lat]
  ];
  if (document.getElementById("isLoop").checked) {
    coords.push([startPoint.lng, startPoint.lat]);
  }

  info.textContent = "Getting bike route...";

  try {
    const res = await fetch("https://api.heigit.org/openrouteservice/v2/directions/cycling-regular/geojson", {
      method: "POST",
      headers: {
        "Authorization": ORS_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ coordinates: coords, elevation: true })
    });
    const data = await res.json();

    if (!res.ok) {
      let errorText = res.status;
      if (data.error) errorText = data.error.message || data.error;
      info.textContent = "Route error: " + errorText;
      return;
    }

    const route = data.features[0];
    distanceKm = Math.round(route.properties.summary.distance / 100) / 10; // meters to km, 1 decimal
    durationMin = Math.round(route.properties.summary.duration / 60);     // seconds to minutes
    climbM = Math.round(route.properties.ascent || 0);

    // ORS gives [lng, lat, elevation] but Leaflet needs [lat, lng]
    routePoints = route.geometry.coordinates.map(function (p) {
      return [p[1], p[0]];
    });

    drawRoute();
    suggestLevel();
    showRouteInfo(true);
  } catch (err) {
    console.log("Route error:", err);
    info.textContent = "Could not reach OpenRouteService. Check your internet or API key.";
  }
}

function drawRoute() {
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(routePoints, { color: "#ef6c00", weight: 5 }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
}

// my own simple rule for the difficulty
function suggestLevel() {
  let level = "Easy";
  if (distanceKm > 60 || climbM > 600) {
    level = "Hard";
  } else if (distanceKm > 25 || climbM > 250) {
    level = "Moderate";
  }
  document.getElementById("difficulty").value = level;
}

function showRouteInfo(withSuggestion) {
  let text = "🛣️ " + distanceKm + " km   ⏱️ " + formatMinutes(durationMin) + "   ⛰️ " + climbM + " m climb";
  if (withSuggestion) {
    text += "   (Suggested level: " + document.getElementById("difficulty").value + ", you can still change it)";
  }
  document.getElementById("routeInfo").textContent = text;
}

// ---------- EDIT MODE ----------
async function loadRideToEdit() {
  document.getElementById("formTitle").textContent = "Edit Ride";
  document.getElementById("saveBtn").textContent = "Save Changes";

  const { data: ride, error } = await db
    .from("rides")
    .select("*")
    .eq("id", editId)
    .single();

  if (error || !ride) {
    alert("Ride not found.");
    window.location.href = "admin.html";
    return;
  }

  document.getElementById("title").value = ride.title;
  document.getElementById("description").value = ride.description || "";
  document.getElementById("rideDate").value = ride.ride_date;
  document.getElementById("startTime").value = ride.start_time.substring(0, 5);
  document.getElementById("difficulty").value = ride.difficulty;
  document.getElementById("maxRiders").value = ride.max_riders;
  document.getElementById("meetingPlace").value = ride.meeting_place || "";
  document.getElementById("isLoop").checked = ride.is_loop;

  // put the markers back (these clear the route, so we load the route after)
  if (ride.start_lat) setStart(ride.start_lat, ride.start_lng);
  if (ride.end_lat) setEnd(ride.end_lat, ride.end_lng);

  if (ride.route_points) {
    routePoints = ride.route_points;
    distanceKm = ride.distance_km;
    durationMin = ride.duration_min;
    climbM = ride.climb_m;
    drawRoute();
    showRouteInfo(false);
  } else if (ride.start_lat) {
    map.setView([ride.start_lat, ride.start_lng], 14);
  }

  document.getElementById("modeEnd").checked = true;
}

// ---------- SAVE ----------
document.getElementById("rideForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const msg = document.getElementById("msg");
  const saveBtn = document.getElementById("saveBtn");
  const rideDate = document.getElementById("rideDate").value;

  if (!editId && rideDate < todayText()) {
    msg.textContent = "The ride date cannot be in the past.";
    return;
  }

  if (!routePoints) {
    const ok = confirm("You have not made a route yet. Save anyway?");
    if (!ok) return;
  }

  const rideData = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    ride_date: rideDate,
    start_time: document.getElementById("startTime").value,
    difficulty: document.getElementById("difficulty").value,
    max_riders: parseInt(document.getElementById("maxRiders").value),
    meeting_place: document.getElementById("meetingPlace").value.trim(),
    start_lat: startPoint ? startPoint.lat : null,
    start_lng: startPoint ? startPoint.lng : null,
    end_lat: endPoint ? endPoint.lat : null,
    end_lng: endPoint ? endPoint.lng : null,
    is_loop: document.getElementById("isLoop").checked,
    route_points: routePoints,
    distance_km: distanceKm,
    duration_min: durationMin,
    climb_m: climbM
  };

  saveBtn.disabled = true;
  msg.textContent = "Saving...";

  let result;
  if (editId) {
    result = await db.from("rides").update(rideData).eq("id", editId);
  } else {
    rideData.created_by = me.id;
    result = await db.from("rides").insert(rideData);
  }

  if (result.error) {
    msg.textContent = "Save failed: " + result.error.message;
    saveBtn.disabled = false;
    return;
  }

  alert("Ride saved!");
  window.location.href = "admin.html";
});

start();
