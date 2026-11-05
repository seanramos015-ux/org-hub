================================================================================
ORGHUB
PRMSU College of Engineering - Student Body Organization (COE-SBO)
README
================================================================================


1. PROJECT DESCRIPTION
--------------------------------------------------------------------------------
OrgHub is a web-based information and records platform for the PRMSU College
of Engineering Student Body Organization (COE-SBO).

The public website gives students and visitors one place to view organization
information, officers, events, gallery updates, reports, resolutions, and
evaluation forms. A separate administrator area lets authorized organization
administrators manage this content without editing code.

Supabase provides authentication, database, and file storage. The website is
hosted on Vercel, and the source code is maintained in a GitHub repository.


2. MAIN FEATURES
--------------------------------------------------------------------------------
PUBLIC WEBSITE
  - Organization information and homepage content
  - Replaceable site logo shown in the navigation bar
  - Dynamic chapter snapshot counts
  - Published officers directory
  - Events and activities listing
  - Photo gallery
  - Published reports and transparency documents
  - Published resolutions
  - Public evaluation forms, when available
  - Responsive layout for desktop and mobile devices

ADMINISTRATOR AREA
  - Administrator login with access verification
  - Dashboard for authorized administrators
  - Create, view, update, and delete records
  - Manage officers, events, gallery items, evaluation forms, and documents
  - Site Settings: edit the logo, organization name, academic year, homepage
    headline and description, mission, and vision
  - Upload public images and manage private PDF documents


3. TECHNOLOGY STACK
--------------------------------------------------------------------------------
FRONT END
  - HTML5 ................ page structure and content
  - CSS3 ................. styling and responsive layout
  - Vanilla JavaScript ... page behavior and Supabase integration

BACK END / CLOUD SERVICES (SUPABASE)
  - PostgreSQL ........... database
  - Supabase Auth ........ administrator sign-in and sessions
  - Supabase Storage ..... images and document files
  - Row Level Security ... database and storage access control

DEPLOYMENT AND SOURCE CONTROL
  - GitHub ............... source code and version control
  - Vercel ............... hosting, with automatic deployments from GitHub


4. PROJECT STRUCTURE
--------------------------------------------------------------------------------
Public site
  index.html ........................ Public homepage
  style.css ......................... Main stylesheet
  public.js ......................... Shared public page behavior (navigation,
                                      hero carousel, mobile menu)
  public-site-settings.js ........... Loads homepage text from site_settings
  public-logo.js .................... Loads the site logo from site_settings
  public-chapter-snapshot.js ........ Loads chapter snapshot counts
  public-events.js .................. Loads published events
  public-gallery.js ................. Loads published gallery items
  public-reports.js ................. Loads published reports
  public-resolutions.js ............. Loads published resolutions
  public-evaluations.js ............. Loads public evaluation forms

Administrator area
  admin-login.html .................. Administrator login page
  admin.js .......................... Login and administrator verification
  admin-dashboard.html / .js ........ Dashboard, session check, and logout
  admin-officers.html ............... Manage officers (logic in officers.js)
  admin-events.html ................. Manage events (logic in events.js)
  admin-gallery.html ................ Manage gallery (logic in gallery.js)
  admin-documents.html .............. Manage documents (logic in documents.js)
  admin-evaluations.html ............ Manage evaluations (logic in
                                      evaluations.js)
  admin-site-settings.html .......... Edit site settings and the site logo

Configuration and assets
  supabase-config.js ................ Supabase Project URL and anon key;
                                      creates the supabaseClient object
  images/ ........................... Website images and local assets

Note: file names may change as the project develops. Keep script references
and file paths consistent with the actual files in the repository. Load
supabase-config.js before any script that uses supabaseClient.


5. REQUIREMENTS
--------------------------------------------------------------------------------
  - A GitHub account
  - A Vercel account
  - A Supabase project
  - A modern web browser
  - The project source files

The site is a static HTML, CSS, and JavaScript application. It does not need
a Node.js build process unless extra tooling is added later.


6. SUPABASE CONFIGURATION
--------------------------------------------------------------------------------
DATABASE
  - Core content tables: officers, events, gallery, documents, evaluations,
    and others used by the public pages.
  - site_settings stores key/value rows (columns: setting_key, setting_value,
    updated_at). Keys in use: organization_name, academic_year,
    homepage_headline, homepage_description, mission, vision, logo_url.
  - admin_users lists the user IDs allowed to administer the site.
  - is_org_admin() is a database function that returns true for users listed
    in admin_users. All admin write policies depend on it.

STORAGE BUCKETS
  - site-assets ... public bucket for the site logo
  - Image and document buckets for officers, gallery, and documents. Use
    public buckets for public images and a private bucket (signed URLs) for
    private PDF documents.

ROW LEVEL SECURITY (RLS)
  - Enable RLS on every table.
  - Public read: allow SELECT on published records only.
  - Admin write: allow INSERT, UPDATE, and DELETE only when is_org_admin()
    returns true.
  - Storage: public SELECT on public buckets; INSERT, UPDATE, and DELETE
    restricted to administrators.
  - If an admin page shows "new row violates row-level security policy", the
    matching table or storage policy is missing or is_org_admin() returned
    false for that user.

SETUP STEPS
  1. Create or open the OrgHub project in Supabase.
  2. Confirm the tables, buckets, RLS policies, and functions above exist.
  3. Copy the Project URL and the publishable (anon) key from Project
     Settings and place them in supabase-config.js.
  4. Create administrator accounts in Supabase Authentication, then add each
     administrator's user ID to the admin_users table.
  5. Keep public sign-up disabled unless the organization intentionally
     changes its access policy.

SECURITY REMINDERS
  - Never place the service_role key in frontend JavaScript.
  - Never commit passwords, private keys, or other secrets.
  - The anon key is safe in the frontend only when RLS is correctly set up.
  - Review RLS and Storage policies before making the site public.


7. DEPLOYMENT (GITHUB + VERCEL)
--------------------------------------------------------------------------------
A. PREPARE THE PROJECT
   1. Confirm the public homepage is named index.html and sits at the
      repository root.
   2. Make sure all HTML, CSS, JavaScript, and image files are included and
      that paths and script references are correct.
   3. Confirm supabase-config.js has the correct Project URL and anon key.
   4. Test the site locally in a browser.
   5. Leave out node_modules, temporary files, archives (such as .zip files),
      and anything containing private credentials.

B. UPLOAD TO GITHUB
   1. Create a repository (for example, org-hub). Private is recommended if
      the source should not be publicly browsable.
   2. Push the project files:
        git init
        git add .
        git commit -m "Initial commit"
        git branch -M main
        git remote add origin https://github.com/YOUR-USERNAME/org-hub.git
        git push -u origin main
   3. Use a GitHub Personal Access Token (or GitHub CLI login) when prompted
      for a password.

C. DEPLOY ON VERCEL
   1. Sign in at https://vercel.com and choose Add New Project.
   2. Import the GitHub repository.
   3. Use these settings:
        Framework Preset ..... Other
        Root Directory ....... ./ (or the folder containing index.html)
        Build Command ........ (leave empty)
        Output Directory ..... . (a single dot)
        Install Command ...... (leave empty)
   4. Click Deploy, wait until it finishes, then open the generated domain.

D. CONFIGURE SUPABASE AUTH URLS
   1. In Supabase, open Authentication > URL Configuration.
   2. Set the Site URL to the deployed Vercel address.
   3. Add the Vercel address to the Redirect URLs allowlist.
   4. Keep localhost entries only if still needed for development.
   5. Save, then test administrator sign-in again.

E. VERIFY THE DEPLOYED WEBSITE
   - Homepage loads with styles and images.
   - Navigation and the mobile menu work.
   - Site Settings content and the logo display correctly.
   - Chapter snapshot counts load.
   - Published officers, events, and gallery items appear.
   - Published reports and resolutions open as intended.
   - Administrator login and verification work.
   - Unauthorized visitors cannot reach administrator functions.
   - Admin add, edit, and delete operations work.
   - Image uploads and private document access work.
   - The site displays correctly on desktop and mobile.


8. UPDATING THE DEPLOYED WEBSITE
--------------------------------------------------------------------------------
  1. Edit the files locally and test in a browser.
  2. Commit and push:
        git add .
        git commit -m "Describe the change"
        git push
  3. Vercel automatically creates a new deployment.
  4. When the deployment shows Ready, refresh the site. If an old version
     still appears, hard refresh or use a private/incognito window.

If no deployment appears, check that the push went to the connected
repository and branch, and review the project's Git settings in Vercel.


9. TROUBLESHOOTING
--------------------------------------------------------------------------------
WEBSITE DOES NOT LOAD
  - Confirm index.html exists in the configured Vercel root directory.
  - Check the latest Vercel deployment logs.
  - Verify the correct repository and branch are connected.

NAVIGATION OR PAGE SCRIPTS DO NOT WORK
  - Open the browser console (F12). A JavaScript error in one script can stop
    the rest of that script from running.
  - Check that every script file referenced in the HTML exists and loads
    without a 404.

CSS OR IMAGES ARE MISSING
  - Check file names, capitalization, and relative paths.
  - Confirm the assets were committed to GitHub.
  - Look for failed requests in the browser Network tab.

SUPABASE DATA DOES NOT APPEAR
  - Confirm the Project URL and anon key are correct.
  - Check console errors.
  - Verify table names, column names, and public-read policies.
  - Confirm the records are marked as published.

LOGO DOES NOT APPEAR OR UPLOAD FAILS
  - Confirm the public site-assets bucket and its policies exist.
  - Confirm site_settings allows public read of the logo_url row.
  - Confirm public-logo.js is loaded on index.html.

ADMIN LOGIN FAILS
  - Confirm the user exists in Supabase Authentication.
  - Confirm the user's ID is in admin_users.
  - Verify the is_org_admin() function and related policies.
  - Confirm the Vercel URL is in the Supabase Redirect URLs.

"ROW VIOLATES ROW-LEVEL SECURITY POLICY" WHEN SAVING
  - Add INSERT, UPDATE, and DELETE policies for administrators on the table
    (or the storage bucket for file uploads), using is_org_admin().

DOCUMENTS DO NOT OPEN
  - Confirm the file exists in the configured private storage bucket.
  - Verify the database record is published.
  - Check storage policies and signed URL generation.
  - Confirm the signed URL has not expired.


10. MAINTENANCE AND PROJECT NOTES
--------------------------------------------------------------------------------
  - Back up important database records and files regularly.
  - Review administrator access whenever officers change, and remove access
    for former administrators.
  - Keep Supabase RLS and Storage policies enabled and reviewed.
  - Test important changes before pushing them to the live website.
  - Keep this README updated when the structure, features, or deployment
    process changes.


PROJECT ........................ OrgHub - PRMSU COE Student Body Organization
HOSTING ........................ Vercel
SOURCE CONTROL ................. GitHub
DATABASE, AUTH, AND STORAGE .... Supabase
================================================================================
