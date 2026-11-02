
 // ==========================================
 // ORGHUB - PUBLIC WEBSITE
 // Dynamic Officers Display
 // ==========================================

 const officerGrid = document.getElementById("officer-grid");

 // ==========================================
 // LOAD PUBLISHED OFFICERS
 // ==========================================

 async function loadPublicOfficers() {
     officerGrid.textContent = "Loading officers...";

     try {
         const { data: officers, error } = await supabaseClient
             .from("officers")
             .select(`
                 id,
                 full_name,
                 position,
                 course_year,
                 photo_path,
                 bio,
                 sort_order
             `)
             .eq("is_published", true)
             .order("sort_order", { ascending: true })
             .order("full_name", { ascending: true });

         if (error) {
             throw error;
         }

         officerGrid.replaceChildren();

         if (!officers || officers.length === 0) {
             officerGrid.textContent =
                 "No published officers available at the moment.";
             return;
         }

         officers.forEach((officer) => {
             const card = document.createElement("div");
             card.className = "officer";

             // PHOTO CONTAINER
             const photoContainer = document.createElement("div");
             photoContainer.className = "photo";

             // INITIALS FALLBACK
             const initials = (officer.full_name || "")
                 .split(" ")
                 .filter(Boolean)
                 .map(word => word[0])
                 .join("")
                 .toUpperCase();

             photoContainer.textContent = initials || "?";

             // OFFICER PHOTO
             if (officer.photo_path) {
                 const image = document.createElement("img");

                 image.src = officer.photo_path;
                 image.alt = officer.full_name + " photo";
                 image.loading = "lazy";

                 image.style.width = "100%";
                 image.style.height = "100%";
                 image.style.objectFit = "cover";
                 image.style.display = "block";

                 image.onerror = () => {
                     image.remove();
                     photoContainer.textContent = initials || "?";
                 };

                 photoContainer.replaceChildren(image);
             }

             // POSITION
             const position = document.createElement("div");
             position.className = "pos";
             position.textContent = officer.position || "";

             // NAME
             const name = document.createElement("div");
             name.className = "name";
             name.textContent = officer.full_name || "";

             // COURSE AND YEAR
             const course = document.createElement("div");
             course.className = "course";
             course.textContent = officer.course_year || "";

             // BIOGRAPHY
             card.append(
                 photoContainer,
                 position,
                 name,
                 course
             );

             if (officer.bio) {
                 const bio = document.createElement("p");

                 bio.className = "officer-bio";
                 bio.textContent = officer.bio;

                 card.appendChild(bio);
             }

             officerGrid.appendChild(card);
         });

     } catch (error) {
         console.error("Public officers loading error:", error);

         officerGrid.textContent =
             "Unable to load officers. Please try again later.";
     }
 }

 // ==========================================
 // INITIALIZE
 // ==========================================

 loadPublicOfficers();
