import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Match the exact same salt and hash as registration
function hashPassword(password) {
  const salt = process.env.AUTH_SECRET || 'ctrl_savings_pbl_secure_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read environment variables (configured in Vercel Settings)
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Database keys not configured in environment variables.' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const hashedPassword = hashPassword(password);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Look for matching user and hashed password
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username')
    .eq('username', cleanUsername)
    .eq('password', hashedPassword)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(400).json({ error: 'Invalid username or password.' });
  }

  return res.status(200).json({ data: data.id });
}
