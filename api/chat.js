import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server environment variables.' });
  }

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User ID is required' });
  }

  const {
    message,
    history = [],
    sessionId,
    sessionName: clientSessionName,
    availableBudget: clientAvailableBudget,
    totalIncome: clientTotalIncome,
    totalExpense: clientTotalExpense,
    budgetPeriod: clientBudgetPeriod,
    sessionGoalAmount: clientGoalAmount,
    sessionGoalTitle: clientGoalTitle
  } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const cleanMessage = message.trim();
  const lowerMsg = cleanMessage.toLowerCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Fetch user profile, cycles, and transactions scoped strictly to userId
  const [userRes, cyclesRes, txsRes] = await Promise.all([
    supabase.from('app_users').select('id, first_name, last_name, username').eq('id', userId).maybeSingle(),
    supabase.from('allowance_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);

  const user = userRes.data || { first_name: 'Student', username: 'user' };
  const displayName = user.first_name || user.username || 'Student';

  const cycles = cyclesRes.data || [];
  // Identify the exact cycle currently viewed by the user
  const activeCycle = (sessionId ? cycles.find(c => c.id === sessionId) : null) ||
                      cycles.find(c => c.is_active || !c.closed_at) ||
                      cycles[0];
  const cycleName = clientSessionName || activeCycle?.name || 'Current Allowance Cycle';
  const goalAmt = clientGoalAmount !== undefined ? Number(clientGoalAmount) : Number(activeCycle?.goal_amount || 0);
  const goalTitle = clientGoalTitle || activeCycle?.goal_title || 'Savings';
  const cadence = clientBudgetPeriod || 'weekly';

  const txs = txsRes.data || [];
  const fallbackIncome = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const fallbackExpense = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

  const totalIncome = clientTotalIncome !== undefined ? Number(clientTotalIncome) : fallbackIncome;
  const totalExpense = clientTotalExpense !== undefined ? Number(clientTotalExpense) : fallbackExpense;
  const availableBalance = clientAvailableBudget !== undefined ? Number(clientAvailableBudget) : (totalIncome - totalExpense);

  // 2. Token-Saver Fast Path (Deterministic queries answered without hitting Gemini API)
  if (lowerMsg === 'balance' || lowerMsg === 'what is my balance' || lowerMsg === 'how much is my balance' || lowerMsg === 'how much money do i have' || lowerMsg === 'my balance') {
    return res.status(200).json({
      action: 'chat',
      reply: `Kumusta, ${displayName}! In your viewed cycle **${cycleName}**, your available balance is **₱${availableBalance.toFixed(2)}** (Total Added: ₱${totalIncome.toFixed(2)}, Total Spent: ₱${totalExpense.toFixed(2)}).`,
      meta: { tokenSaved: true }
    });
  }

  if (lowerMsg === 'recent expenses' || lowerMsg === 'show my expenses' || lowerMsg === 'my expenses') {
    const expenseList = txs.filter(t => t.type === 'expense').slice(0, 5);
    if (expenseList.length === 0) {
      return res.status(200).json({
        action: 'chat',
        reply: `You haven't recorded any expenses in **${cycleName}** yet! All **₱${availableBalance.toFixed(2)}** is intact.`,
        meta: { tokenSaved: true }
      });
    }
    const lines = expenseList.map(t => `* **${t.description || t.category}**: ₱${Number(t.amount).toFixed(2)} (${new Date(t.created_at).toLocaleDateString()})`).join('\n');
    return res.status(200).json({
      action: 'chat',
      reply: `Here are your recent expenses for **${cycleName}**:\n\n${lines}\n\nTotal spent: **₱${totalExpense.toFixed(2)}**.`,
      meta: { tokenSaved: true }
    });
  }

  // 3. Call Gemini Model (gemini-3.6-flash) for intelligent reasoning & transaction extraction
  const recentSnippet = txs.slice(0, 8).map(t => ({
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    category: t.category,
    date: t.created_at
  }));

  const systemPrompt = `You are Ctrl+Advisor, the intelligent, friendly, student-oriented financial coach in the Ctrl+Savings allowance tracker app at USTP (University of Science and Technology of Southern Philippines) in Cagayan de Oro.
User Profile:
- Name: ${displayName}
- CURRENT VIEWED ALLOWANCE CYCLE: "${cycleName}"
- Available Balance in "${cycleName}": ₱${availableBalance.toFixed(2)}
- Total Added to "${cycleName}": ₱${totalIncome.toFixed(2)}
- Total Spent from "${cycleName}": ₱${totalExpense.toFixed(2)}
- Cadence: ${cadence}
- Target Savings Goal for "${cycleName}": ₱${goalAmt.toFixed(2)} (${goalTitle})
- Recent transactions (up to 8): ${JSON.stringify(recentSnippet)}

CRITICAL SESSION RULES:
- The user is currently viewing and managing their "${cycleName}" allowance cycle.
- All advice, balance checks, and transaction logs MUST relate directly to "${cycleName}".
- Explicitly mention "${cycleName}" in your response so the student always knows which cycle is being discussed or updated.

CRITICAL DEDUPLICATION & EXTRACTION RULES:
- When a user states what they bought/ate and the amount spent in the same message (e.g. "i ate burger i spent 200 pesos", "bought coffee for 100 pesos", "paid 15 pesos for jeepney"), this is ONE SINGLE TRANSACTION.
- NEVER create duplicate transactions for a single purchase.
- Do NOT assume multiple quantities unless explicitly stated with quantity words (e.g. "2 burgers", "two coffees").
- Only extract multiple transactions when distinct separate items/amounts are explicitly described (e.g. "my papa gave me 200 pesos but i spent 50 pesos" -> 1 income of 200, 1 expense of 50; or "bought burger for 100 and fries for 50" -> 2 expenses: 100 and 50).

Your Goals:
1. Detect financial actions:
   - When user spent money, bought items, paid fares/canteen, or received cash/allowance/remittance, classify as "add_transaction".
   - In "transactions", provide an array of objects. Each item must have:
     * "type": "expense" or "income"
     * "amount": positive number in Philippine Pesos
     * "description": short clean item name (e.g. "Burger", "Coffee", "Jeepney Fare", "Snack Expense", "Allowance from Papa")
     * "category": one of ["Food", "Transport", "School", "Bills", "Leisure", "Shopping", "Allowance", "Other"]
   - If an expense exceeds the user's available balance in "${cycleName}" (₱${availableBalance.toFixed(2)}), clearly state in your reply that it exceeds their funds in "${cycleName}" and ask if they are sure they want to record it.
2. For advice, analysis, savings ideas, or questions:
   - Classify as "chat". Provide friendly, empathetic, actionable student advice formatted nicely in Markdown with emojis.
   - Address ${displayName} warmly and reference "${cycleName}".

OUTPUT FORMAT:
Respond STRICTLY with valid JSON.
{
  "action": "add_transaction" | "chat",
  "transactions": [
    {
      "type": "expense" | "income",
      "amount": <number>,
      "description": "<string>",
      "category": "<category>"
    }
  ],
  "reply": "<friendly, clear message directly answering the user, mentioning ${cycleName}>"
}`;

  const tryCallGemini = async (modelName) => {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Format past message history (last 10 turns) into Gemini format
    const formattedHistory = (Array.isArray(history) ? history.slice(-10) : [])
      .filter(h => h && h.text && typeof h.text === 'string' && !h.isError && h.id !== 'msg_welcome')
      .map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: '{"action":"chat","reply":"Understood! I will act as Ctrl+Advisor for the current cycle with strict deduplication."}' }] },
      ...formattedHistory,
      { role: 'user', parts: [{ text: cleanMessage }] }
    ];

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const geminiData = await response.json();
    if (!response.ok) {
      throw new Error(geminiData.error?.message || `Gemini API returned ${response.status}`);
    }
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No candidate text received from Gemini');
    }
    return JSON.parse(candidateText);
  };

  try {
    let parsed;
    try {
      // Primary fast model (verified 1.4s response time)
      parsed = await tryCallGemini('gemini-3.6-flash');
    } catch (e1) {
      console.warn('gemini-3.6-flash failed, trying gemini-3.7-flash:', e1.message);
      try {
        parsed = await tryCallGemini('gemini-3.7-flash');
      } catch (e2) {
        console.warn('gemini-3.7-flash failed, trying gemini-flash-latest:', e2.message);
        parsed = await tryCallGemini('gemini-flash-latest');
      }
    }

    // Validate and enrich parsed result
    if (parsed.action === 'add_transaction') {
      const rawList = Array.isArray(parsed.transactions)
        ? parsed.transactions
        : (parsed.transaction ? [parsed.transaction] : []);

      if (rawList.length > 0) {
        const validatedTxs = rawList.map(t => {
          const isExp = t.type === 'expense';
          return {
            type: isExp ? 'expense' : 'income',
            amount: Math.abs(Number(t.amount)) || 0,
            description: t.description || (isExp ? 'Expense' : 'Income'),
            category: t.category || (isExp ? 'Food' : 'Allowance')
          };
        }).filter(t => t.amount > 0);

        // Programmatic Deduplication Safeguard: Drop unintended duplicate items
        const seenCounts = new Map();
        const deduplicatedTxs = [];
        for (const t of validatedTxs) {
          const key = `${t.type}_${t.amount}_${t.description.toLowerCase()}`;
          const count = seenCounts.get(key) || 0;
          if (count > 0) {
            const hasMultiple = /\b(2|3|4|two|three|four|both|pair|twice|double|separate)\b/i.test(cleanMessage);
            if (!hasMultiple) continue; // Skip duplicate
          }
          seenCounts.set(key, count + 1);
          deduplicatedTxs.push(t);
        }

        // Check if any expense exceeds current balance
        const totalExpensesInBatch = deduplicatedTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const totalIncomeInBatch = deduplicatedTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        
        // If income is part of the batch, net available becomes availableBalance + income
        const effectiveBalance = availableBalance + totalIncomeInBatch;
        const exceedsBudget = totalExpensesInBatch > effectiveBalance;
        const overAmount = exceedsBudget ? totalExpensesInBatch - effectiveBalance : 0;

        return res.status(200).json({
          action: 'add_transaction',
          transactions: deduplicatedTxs,
          transaction: deduplicatedTxs[0], // backward compatibility
          exceedsBudget,
          overAmount,
          reply: parsed.reply || `Recorded transactions for ${deduplicatedTxs.map(t => t.description).join(', ')} in ${cycleName}.`
        });
      }
    }

    return res.status(200).json({
      action: parsed.action || 'chat',
      reply: parsed.reply || `Here is what I found for your allowance in ${cycleName}.`
    });

  } catch (err) {
    console.error('All Gemini model calls failed:', err.message);

    // Heuristic Fallback for Compound and Single transactions if offline or rate limited
    const expenseMatch = cleanMessage.match(/(?:bought|buy|spent|pay|paid|cost|worth|for)\s+(?:a\s+|an\s+)?([a-zA-Z\s]+?)\s+(?:for|worth)?\s*(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)/i) ||
                         cleanMessage.match(/(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)?\s+(?:for|on)\s+([a-zA-Z\s]+)/i);

    const incomeMatch = cleanMessage.match(/(?:received|got|added|allowance|deposit|given|gave me)\s+(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)/i) ||
                        cleanMessage.match(/(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)?\s+(?:allowance|income|baon)/i);

    const fallbackTxs = [];

    if (incomeMatch) {
      const amt = parseFloat(incomeMatch[1]);
      if (!isNaN(amt) && amt > 0) {
        fallbackTxs.push({
          type: 'income',
          amount: amt,
          description: cleanMessage.includes('papa') ? 'Allowance from Papa' : (cleanMessage.includes('mama') ? 'Allowance from Mama' : 'Allowance Deposit'),
          category: 'Allowance'
        });
      }
    }

    if (expenseMatch) {
      let desc = expenseMatch[1];
      let amt = parseFloat(expenseMatch[2]);
      if (isNaN(amt)) {
        amt = parseFloat(expenseMatch[1]);
        desc = expenseMatch[2];
      }
      if (!isNaN(amt) && amt > 0) {
        desc = (desc || 'Expense').trim();
        let cat = 'Food';
        const dLow = desc.toLowerCase();
        if (dLow.includes('jeep') || dLow.includes('fare') || dLow.includes('bus') || dLow.includes('taxi') || dLow.includes('angkas')) cat = 'Transport';
        else if (dLow.includes('book') || dLow.includes('print') || dLow.includes('school') || dLow.includes('project')) cat = 'School';
        
        fallbackTxs.push({
          type: 'expense',
          amount: amt,
          description: desc,
          category: cat
        });
      }
    }

    if (fallbackTxs.length > 0) {
      const totalExp = fallbackTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const totalInc = fallbackTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const effectiveBal = availableBalance + totalInc;
      const exceeds = totalExp > effectiveBal;
      const overAmt = exceeds ? totalExp - effectiveBal : 0;

      return res.status(200).json({
        action: 'add_transaction',
        transactions: fallbackTxs,
        transaction: fallbackTxs[0],
        exceedsBudget: exceeds,
        overAmount: overAmt,
        reply: `Got it, ${displayName}! Recorded ${fallbackTxs.map(t => `${t.description} (₱${t.amount.toFixed(2)})`).join(' and ')} in your **${cycleName}** cycle. Your balance is now ₱${Math.max(0, effectiveBal - totalExp).toFixed(2)}.`,
        fallbackMode: true
      });
    }

    // Zero-gatekeeping: if nothing could be parsed and Gemini failed, surface the error
    return res.status(502).json({
      error: `Gemini API Error: ${err.message}. Please verify internet or API quota.`
    });
  }
}
