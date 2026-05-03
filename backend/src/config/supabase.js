const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase URL or Key is missing in .env");
}

if (supabaseKey && !supabaseKey.startsWith("eyJ")) {
    console.warn("⚠️  Warning: Supabase Key does not appear to be a valid JWT.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
