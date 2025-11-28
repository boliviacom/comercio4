const supabaseUrl = 'https://evqykmpnlfwwcxlqkmdg.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cXlrbXBubGZ3d2N4bHFrbWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTA5MDgsImV4cCI6MjA3NTM2NjkwOH0.iUUnY-D-YfqWf9jL9Hk5JCVH66AfYRgGSlQcEtCpSNw'; 
const clientInstance = supabase.createClient(supabaseUrl, supabaseAnonKey);
export { clientInstance as supabase };