// admin dashboard

let me = null;

async function start() {
  me = await checkLogin(true);
  if (!me) return;

  loadRides();
  loadUsers();
}

// ---------- RIDES TABLE + STATS ----------
async function loadRides() {
  const table = document.getElementById("rideTable");

  const { data, error } = await db
    .from("rides")
    .select("id, title, ride_date, start_time, difficulty, distance_km, max_riders, ride_joins(count)")
    .order("ride_date", { ascending: false });

  if (error) {
    table.innerHTML = '<tr><td colspan="6" class="msg">Error: ' + clean(error.message) + '</td></tr>';
    return;
  }

  const today = todayText();
  let upcoming = 0;
  let totalJoins = 0;
  let totalKm = 0;
  let popularRide = null;
  let popularCount = 0;
  let html = "";

  data.forEach(function (ride) {
    let joined = 0;
    if (ride.ride_joins && ride.ride_joins.length > 0) {
      joined = ride.ride_joins[0].count;
    }

    const isUpcoming = ride.ride_date >= today;
    if (isUpcoming) upcoming++;
    totalJoins += joined;
    if (ride.distance_km) totalKm += Number(ride.distance_km);

    if (joined > popularCount) {
      popularCount = joined;
      popularRide = ride;
    }

    // how full the ride is, for the small bar
    let percent = Math.round((joined / ride.max_riders) * 100);
    if (percent > 100) percent = 100;

    html += '<tr>' +
      '<td><b>' + clean(ride.title) + '</b>' + (isUpcoming ? '' : ' <span class="tag">Done</span>') + '</td>' +
      '<td>' + formatDate(ride.ride_date) + '<br><small class="muted">' + formatTime(ride.start_time) + '</small></td>' +
      '<td><span class="tag tag-' + clean(ride.difficulty) + '">' + clean(ride.difficulty) + '</span></td>' +
      '<td>' + (ride.distance_km ? ride.distance_km + ' km' : '-') + '</td>' +
      '<td>' + joined + ' / ' + ride.max_riders +
      '<div class="bar"><div style="width: ' + percent + '%;"></div></div></td>' +
      '<td>' +
      '<a class="btn btn-small btn-green" href="ride.html?id=' + ride.id + '">View</a>' +
      '<a class="btn btn-small btn-gray" href="ride-form.html?id=' + ride.id + '">Edit</a>' +
      '<button class="btn-small btn-red" onclick="deleteRide(' + ride.id + ')">Delete</button>' +
      '</td></tr>';
  });

  if (data.length === 0) {
    html = '<tr><td colspan="6" class="muted">No rides yet. Click + New Ride to make one.</td></tr>';
  }
  table.innerHTML = html;

  document.getElementById("statRides").textContent = data.length;
  document.getElementById("statUpcoming").textContent = upcoming;
  document.getElementById("statJoins").textContent = totalJoins;
  document.getElementById("statKm").textContent = Math.round(totalKm);

  if (popularRide) {
    document.getElementById("popular").innerHTML =
      '<b>' + clean(popularRide.title) + '</b> with ' + popularCount + ' riders (' +
      formatDate(popularRide.ride_date) + ')';
  } else {
    document.getElementById("popular").textContent = "No one has joined a ride yet.";
  }
}

async function deleteRide(rideId) {
  if (!confirm("Delete this ride? The riders who joined it will also be removed.")) return;

  const { error } = await db
    .from("rides")
    .delete()
    .eq("id", rideId);

  if (error) {
    alert("Delete failed: " + error.message);
    return;
  }
  loadRides();
}

// ---------- USERS TABLE ----------
async function loadUsers() {
  const table = document.getElementById("userTable");

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, email, role, created_at, ride_joins(count)")
    .order("created_at", { ascending: true });

  if (error) {
    table.innerHTML = '<tr><td colspan="4" class="msg">Error: ' + clean(error.message) + '</td></tr>';
    return;
  }

  let riderCount = 0;
  let html = "";

  data.forEach(function (user) {
    if (user.role === "rider") riderCount++;

    let joined = 0;
    if (user.ride_joins && user.ride_joins.length > 0) {
      joined = user.ride_joins[0].count;
    }

    // admin cannot change their own role, so they don't lock themselves out
    const disabled = user.id === me.id ? " disabled" : "";

    html += '<tr>' +
      '<td>' + clean(user.full_name) + (user.id === me.id ? ' (you)' : '') + '</td>' +
      '<td>' + clean(user.email) + '</td>' +
      '<td>' + joined + '</td>' +
      '<td><select onchange="changeRole(\'' + user.id + '\', this.value)"' + disabled + '>' +
      '<option value="rider"' + (user.role === "rider" ? " selected" : "") + '>Rider</option>' +
      '<option value="admin"' + (user.role === "admin" ? " selected" : "") + '>Admin</option>' +
      '</select></td>' +
      '</tr>';
  });

  table.innerHTML = html;
  document.getElementById("statRiders").textContent = riderCount;
}

async function changeRole(userId, newRole) {
  if (!confirm("Change this user's role to " + newRole + "?")) {
    loadUsers();
    return;
  }

  const { error } = await db
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    alert("Could not change role: " + error.message);
  }
  loadUsers();
}

start();
