// admin dashboard

let me = null;

async function start() {
  me = await checkLogin(true);
  if (!me) return;

  document.getElementById("welcome").textContent =
    "Welcome, " + me.full_name + "! You are logged in as " + me.role + ".";
}

start();
