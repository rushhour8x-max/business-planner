/* ============================================
   Supabase Client — Cloud Database Connection
   ============================================ */
const SupabaseClient = (() => {
  const SUPABASE_URL = 'https://utqaztvjjecrtceqerxv.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cWF6dHZqamVjcnRjZXFlcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDQ0NTgsImV4cCI6MjA5MDg4MDQ1OH0.BVHxpeLMvKR9_GAC7hBXBtllfHEeheyj3py7suRb6Bs';

  let _client = null;

  function getClient() {
    if (!_client) {
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.warn('Supabase JS library not loaded');
        return null;
      }
      _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _client;
  }

  function isAvailable() {
    return getClient() !== null;
  }

  return { getClient, isAvailable, SUPABASE_URL };
})();
