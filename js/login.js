// login page

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginBtn.disabled = true;
  msg.textContent = "Logging in...";

  const { data, error } = await db.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    msg.textContent = "Login failed: " + error.message;
    loginBtn.disabled = false;
    return;
  }

  goToHome(data.user.id);
});

// admin goes to dashboard, rider goes to rides page
async function goToHome(userId) {
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile && profile.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "rides.html";
  }
}

// if already logged in, skip the login page
db.auth.getSession().then(function (res) {
  if (res.data.session) {
    goToHome(res.data.session.user.id);
  }
});
