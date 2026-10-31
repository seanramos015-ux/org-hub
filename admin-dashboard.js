
const adminEmail = document.getElementById("admin-email");
const accessStatus = document.getElementById("access-status");
const logoutButton = document.getElementById("logout-button");

async function protectDashboard() {
    try {
        // Check whether a user is signed in
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        const session = sessionData.session;

        if (!session) {
            window.location.replace("admin-login.html");
            return;
        }

        // Verify administrator privileges
        const { data: isAdmin, error: adminError } =
            await supabaseClient.rpc("is_org_admin");

        if (adminError) throw adminError;

        if (isAdmin !== true) {
            await supabaseClient.auth.signOut();
            window.location.replace("admin-login.html");
            return;
        }

        // Display authenticated administrator
        adminEmail.textContent = "Signed in as: " + session.user.email;

        accessStatus.textContent =
            "Administrator access verified successfully.";

    } catch (error) {
        console.error("Dashboard verification failed:", error);

        accessStatus.style.color = "red";
        accessStatus.textContent =
            "Unable to verify access. Please sign in again.";

        await supabaseClient.auth.signOut();
        
        window.location.replace("admin-login.html");
    }
}

// Sign out
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Sign out failed:", error);
        logoutButton.disabled = false;
        return;
    }

    window.location.replace("admin-login.html");
});

// Run security verification
protectDashboard();
