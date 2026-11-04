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
  loadRiders();
}

function showRideInfo() {
  document.title = "RideTayo - " + ride.title;
  document.getElementById("title").textContent = ride.title;
  document.getElementById("description").textContent = ride.description || "No description.";

  const level = document.getElementById("level");
  level.textContent = ride.difficulty;
  level.className = "tag tag-" + ride.difficulty;

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

  loadRiders();
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
