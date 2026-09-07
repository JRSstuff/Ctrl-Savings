import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Database keys not configured in environment variables.' });
  }

  const userId = req.headers['x-user-id'] || req.query?.id;

  if (!userId || userId === 'undefined' || userId === 'null') {
    return res.status(401).json({ error: 'Unauthorized: User ID is required' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, first_name, middle_name, last_name, date_of_birth, total_budget, available_budget, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'User not found in database.' });
  }

  return res.status(200).json({ data });
}
