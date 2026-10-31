
const SUPABASE_URL = "https://haxdjcuvbduyoaojzclq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RKG6fCl5hwBhXoTL-e_31A_FuGdOOjE";

// Initialize Supabase
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("OrgHub Supabase connection initialized!");
