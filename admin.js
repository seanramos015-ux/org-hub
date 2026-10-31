
const loginForm = document.getElementById("admin-login-form");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    loginMessage.textContent = "";
    loginMessage.style.color = "#555";

    try {
        // Step 1: Authenticate with Supabase
        const { data: authData, error: authError } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (authError) {
            throw authError;
        }

        // Step 2: Verify OrgHub administrator access
        const { data: isAdmin, error: adminError } =
            await supabaseClient.rpc("is_org_admin");

        if (adminError) {
            throw adminError;
        }

        if (isAdmin !== true) {
            await supabaseClient.auth.signOut();

            throw new Error(
                "This account is not authorized to access OrgHub Admin."
            );
        }

        // Step 3: Successful login
        loginMessage.style.color = "green";
        loginMessage.textContent = "Login successful! Redirecting...";

        window.location.href = "admin-dashboard.html";

    } catch (error) {
        loginMessage.style.color = "red";
        loginMessage.textContent =
            error.message || "Unable to sign in.";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});
