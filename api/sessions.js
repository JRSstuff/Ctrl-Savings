import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User ID is required' });
  }

  // GET: Fetch all allowance cycles for this user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('allowance_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  }

  // POST: Create a new cycle (and close previous active cycle)
  if (req.method === 'POST') {
    const { name, description, goal_amount, goal_title } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Cycle name is required.' });
    }

    const nowIso = new Date().toISOString();

    // Close any previous active cycle
    await supabase
      .from('allowance_sessions')
      .update({ is_active: false, closed_at: nowIso })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Insert new active cycle
    const { data, error } = await supabase
      .from('allowance_sessions')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description ? description.trim() : null,
        goal_amount: Number(goal_amount) || 0,
        goal_title: goal_title ? goal_title.trim() : null,
        is_active: true,
        created_at: nowIso,
        closed_at: null
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  // PUT: Update an existing cycle (name, goal, description, is_active)
  if (req.method === 'PUT') {
    const { id, name, description, goal_amount, goal_title, is_active, closed_at } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Cycle ID is required.' });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ error: `Cycle ID "${id}" is not a valid UUID.` });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (goal_amount !== undefined) updates.goal_amount = Number(goal_amount) || 0;
    if (goal_title !== undefined) updates.goal_title = goal_title ? goal_title.trim() : null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (closed_at !== undefined) updates.closed_at = closed_at;

    const { data, error } = await supabase
      .from('allowance_sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  // DELETE: Delete a cycle
  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;

    if (!id) {
      return res.status(400).json({ error: 'Cycle ID is required to delete.' });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(200).json({ success: true, deletedId: id, note: 'Local-only cycle removed.' });
    }

    const { error } = await supabase
      .from('allowance_sessions')
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
