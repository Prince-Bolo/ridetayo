// add / edit ride page (admin only)

let me = null;
const editId = getIdFromLink(); // if there is an id, we are editing

async function start() {
  me = await checkLogin(true);
  if (!me) return;

  if (editId) {
    loadRideToEdit();
  }
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

  const rideData = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    ride_date: rideDate,
    start_time: document.getElementById("startTime").value,
    difficulty: document.getElementById("difficulty").value,
    max_riders: parseInt(document.getElementById("maxRiders").value),
    meeting_place: document.getElementById("meetingPlace").value.trim()
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
