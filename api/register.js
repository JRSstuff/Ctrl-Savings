import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Securely hash passwords so plaintext passwords are NEVER stored in the database
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

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Sanitize and validate username
  const cleanUsername = username.trim().toLowerCase();

  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Check if username is already taken
  const { data: existing, error: checkError } = await supabase
    .from('app_users')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (checkError) {
    return res.status(500).json({ error: checkError.message });
  }

  if (existing) {
    return res.status(400).json({ error: 'Username already exists.' });
  }

  // Hash the password securely before storing
  const hashedPassword = hashPassword(password);

  const { data, error: insertError } = await supabase
    .from('app_users')
    .insert({ username: cleanUsername, password: hashedPassword })
    .select('id')
    .single();

  if (insertError) {
    return res.status(400).json({ error: insertError.message });
  }

  return res.status(200).json({ data: data.id });
}
