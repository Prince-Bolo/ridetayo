// rides page (what riders see after login)

let me = null;

async function start() {
  me = await checkLogin(false);
  if (!me) return;

  document.getElementById("welcome").textContent =
    "Welcome, " + me.full_name + "! You are logged in as " + me.role + ".";
}

start();
