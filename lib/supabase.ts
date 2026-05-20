import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://akcwlxkpsdeudinpoyfd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3dseGtwc2RldWRpbnBveWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTc3ODAsImV4cCI6MjA5NDgzMzc4MH0.WQU5_9MbcNLZFsQuNiOO4ickquENcLmqAQuCx7S91L0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);