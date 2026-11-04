// admin dashboard

let me = null;

async function start() {
  me = await checkLogin(true);
  if (!me) return;

  loadRides();
}

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
  let html = "";

  data.forEach(function (ride) {
    let joined = 0;
    if (ride.ride_joins && ride.ride_joins.length > 0) {
      joined = ride.ride_joins[0].count;
    }

    const isUpcoming = ride.ride_date >= today;

    html += '<tr>' +
      '<td><b>' + clean(ride.title) + '</b>' + (isUpcoming ? '' : ' <span class="tag">Done</span>') + '</td>' +
      '<td>' + formatDate(ride.ride_date) + '<br><small class="muted">' + formatTime(ride.start_time) + '</small></td>' +
      '<td><span class="tag tag-' + clean(ride.difficulty) + '">' + clean(ride.difficulty) + '</span></td>' +
      '<td>' + (ride.distance_km ? ride.distance_km + ' km' : '-') + '</td>' +
      '<td>' + joined + ' / ' + ride.max_riders + '</td>' +
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

start();
