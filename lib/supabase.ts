import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://akcwlxkpsdeudinpoyfd.supabase.co";
const supabaseAnonKey = "sb_publishable_1O5aoPpplgyOw3viYzlYBQ_pIygGTuX";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
