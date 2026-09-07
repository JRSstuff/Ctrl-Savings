import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Read environment variables
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Extract user_id from headers (since it's a simple app, the frontend sends it via header or body)
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User ID is required' });
  }

  // GET: Fetch user's transactions
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  // POST: Add a new transaction
  if (req.method === 'POST') {
    const { type, amount, description, category } = req.body || {};

    if (!type || !amount || !description) {
      return res.status(400).json({ error: 'Type, amount, and description are required.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Invalid transaction type.' });
    }

    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type,
        amount: Number(amount),
        description: description.trim(),
        category: category ? category.trim() : null
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  // DELETE: Delete a transaction
  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ error: `Transaction ID "${id}" is not a valid UUID.` });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, deletedId: id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
