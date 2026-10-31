// register page
// new accounts are always "rider". The admin can make someone admin later.

const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const msg = document.getElementById("msg");

registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  if (password !== password2) {
    msg.textContent = "Passwords do not match.";
    return;
  }

  registerBtn.disabled = true;
  msg.textContent = "Creating account...";

  // full_name is saved in the user info, then the database
  // trigger copies it into the profiles table
  const { data, error } = await db.auth.signUp({
    email: email,
    password: password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    msg.textContent = "Register failed: " + error.message;
    registerBtn.disabled = false;
    return;
  }

  if (data.session) {
    // email confirm is off, so the user is logged in already
    window.location.href = "rides.html";
  } else {
    msg.style.color = "#2e7d32";
    msg.textContent = "Account created! Check your email to confirm, then login.";
  }
});
