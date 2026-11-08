// RideTayo settings
// Replace the values below with your own keys (see README.md)

// Supabase (database + login)
const SUPABASE_URL = "https://dxwukkfimgdddrmxniuz.supabase.co";
const SUPABASE_KEY = "sb_publishable_JbhiUgBYw1ef_qWcBcg-kQ_gakw_r2A";

// OpenRouteService (bike route, distance, climb)
const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZmNDQ2NTdjNjc3YTQwMTNhMWUxYmYwMWU3MGRiMWY0IiwiaCI6Im11cm11cjY0In0=";

// Cloudinary (ride poster upload)
const CLOUDINARY_CLOUD = "fvn3jhsz";
const CLOUDINARY_PRESET = "djilzeho";

// EmailJS (email when a rider joins)
const EMAILJS_PUBLIC_KEY = "yxmQ_f_XZbM0gvuau";
const EMAILJS_SERVICE = "service_j2rd6bt";
const EMAILJS_TEMPLATE = "template_410fpzy";

// connect to supabase
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
