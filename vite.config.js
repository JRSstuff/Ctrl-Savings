import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

// Local development simulation for backend API routes so serverless calls work during vite dev & preview
function apiDevPlugin(env) {
  const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const AUTH_SECRET = env.AUTH_SECRET || 'ctrl_savings_pbl_secure_salt_2026'
  const GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY

  const apiMiddleware = async (req, res, next) => {
    // Backend Login API
    if (req.url === '/api/login' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { username, password } = JSON.parse(body || '{}')
          if (!username || !password) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username and password are required.' }))
            return
          }

          const cleanUsername = username.trim().toLowerCase()
          const hashedPassword = hashPassword(password, AUTH_SECRET)

          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
          
          const { data, error } = await supabase
            .from('app_users')
            .select('id, username, password, first_name, last_name, middle_name, date_of_birth, total_budget, available_budget')
            .eq('username', cleanUsername)
            .maybeSingle()
          
          res.setHeader('Content-Type', 'application/json')
          if (error) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: error.message }))
          } else if (!data) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid username or password.' }))
          } else {
            const isMatch = (data.password === hashedPassword) || (data.password === password)
            if (!isMatch) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid username or password.' }))
            } else {
              if (data.password === password) {
                try {
                  await supabase.from('app_users').update({ password: hashedPassword }).eq('id', data.id)
                } catch(e) {}
              }
              delete data.password
              res.statusCode = 200
              res.end(JSON.stringify({ data }))
            }
          }
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Server error processing login.' }))
        }
      })
      return
    }

    // Backend Register API
    if (req.url === '/api/register' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { username, password, firstName, middleName, lastName, dateOfBirth } = JSON.parse(body || '{}')
          if (!username || !password) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username and password are required.' }))
            return
          }

          if (!firstName || !lastName || !dateOfBirth) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'First name, last name, and date of birth are required.' }))
            return
          }

          const cleanUsername = username.trim().toLowerCase()

          if (cleanUsername.length < 3 || cleanUsername.length > 30) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username must be between 3 and 30 characters.' }))
            return
          }

          if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username can only contain letters, numbers, and underscores.' }))
            return
          }

          if (password.length < 4) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Password must be at least 4 characters.' }))
            return
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
          
          // Check if username is already taken
          const { data: existing, error: checkErr } = await supabase
            .from('app_users')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle()

          if (checkErr) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: checkErr.message }))
            return
          }

          if (existing) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Username already exists.' }))
            return
          }

          // Hash password securely
          const hashedPassword = hashPassword(password, AUTH_SECRET)

          // Insert new user
          const { data, error: insertErr } = await supabase
            .from('app_users')
            .insert({ 
              username: cleanUsername, 
              password: hashedPassword,
              first_name: firstName.trim(),
              middle_name: middleName ? middleName.trim() : null,
              last_name: lastName.trim(),
              date_of_birth: dateOfBirth
            })
            .select('id, username, first_name, last_name, middle_name, date_of_birth, total_budget, available_budget')
            .single()
          
          res.setHeader('Content-Type', 'application/json')
          if (insertErr) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: insertErr.message }))
          } else {
            res.statusCode = 200
            res.end(JSON.stringify({ data }))
          }
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Server error processing registration.' }))
        }
      })
      return
    }

    // Backend User Profile API
    if (req.url === '/api/user' || req.url.startsWith('/api/user?')) {
      const userId = req.headers['x-user-id']
      if (!userId || userId === 'undefined' || userId === 'null') {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Unauthorized: User ID is required' }))
        return
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, first_name, middle_name, last_name, date_of_birth, total_budget, available_budget, created_at')
        .eq('id', userId)
        .maybeSingle()

      res.setHeader('Content-Type', 'application/json')
      if (error) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: error.message }))
      } else if (!data) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'User not found.' }))
      } else {
        res.statusCode = 200
        res.end(JSON.stringify({ data }))
      }
      return
    }

    // Backend Transactions API
    if (req.url === '/api/transactions' || req.url.startsWith('/api/transactions?')) {
      const userId = req.headers['x-user-id']
      if (!userId) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Unauthorized: User ID is required' }))
        return
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        res.statusCode = error ? 500 : 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(error ? { error: error.message } : { data }))
        return
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { type, amount, description, category } = JSON.parse(body || '{}')
            if (!type || !amount || !description) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Type, amount, and description are required.' }))
              return
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
              .single()
            
            res.statusCode = error ? 500 : 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(error ? { error: error.message } : { data }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Server error processing transaction.' }))
          }
        })
        return
      }

      if (req.method === 'DELETE') {
        const urlObj = new URL(req.url, 'http://localhost')
        const id = urlObj.searchParams.get('id')
        if (!id) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Transaction ID is required.' }))
          return
        }

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!UUID_REGEX.test(id)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Invalid transaction ID: "${id}" is not a valid UUID.` }))
          return
        }

        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)

        res.statusCode = error ? 500 : 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(error ? { error: error.message } : { success: true, deletedId: id }))
        return
      }
    }

    // Backend Allowance Sessions API
    if (req.url.startsWith('/api/sessions')) {
      const userId = req.headers['x-user-id']
      if (!userId) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Unauthorized: User ID is required' }))
        return
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('allowance_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        res.setHeader('Content-Type', 'application/json')
        if (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: error.message }))
        } else {
          res.statusCode = 200
          res.end(JSON.stringify({ data: data || [] }))
        }
        return
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { name, description, goal_amount, goal_title } = JSON.parse(body || '{}')
            if (!name || !name.trim()) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Cycle name is required.' }))
              return
            }

            const nowIso = new Date().toISOString()
            await supabase
              .from('allowance_sessions')
              .update({ is_active: false, closed_at: nowIso })
              .eq('user_id', userId)
              .eq('is_active', true)

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
              .single()

            res.statusCode = error ? 500 : 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(error ? { error: error.message } : { data }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Server error creating cycle.' }))
          }
        })
        return
      }

      if (req.method === 'PUT') {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', async () => {
          try {
            const { id, name, description, goal_amount, goal_title, is_active, closed_at } = JSON.parse(body || '{}')
            if (!id) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Cycle ID is required.' }))
              return
            }

            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            if (!UUID_REGEX.test(id)) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Invalid cycle ID: "${id}" is not a valid UUID.` }))
              return
            }

            const updates = {}
            if (name !== undefined) updates.name = name.trim()
            if (description !== undefined) updates.description = description ? description.trim() : null
            if (goal_amount !== undefined) updates.goal_amount = Number(goal_amount) || 0
            if (goal_title !== undefined) updates.goal_title = goal_title ? goal_title.trim() : null
            if (is_active !== undefined) updates.is_active = Boolean(is_active)
            if (closed_at !== undefined) updates.closed_at = closed_at

            const { data, error } = await supabase
              .from('allowance_sessions')
              .update(updates)
              .eq('id', id)
              .eq('user_id', userId)
              .select('*')
              .single()

            res.statusCode = error ? 500 : 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(error ? { error: error.message } : { data }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Server error updating cycle.' }))
          }
        })
        return
      }

      if (req.method === 'DELETE') {
        const urlObj = new URL(req.url, 'http://localhost')
        const id = urlObj.searchParams.get('id')

        if (!id) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Cycle ID is required.' }))
          return
        }

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!UUID_REGEX.test(id)) {
          // Gracefully clean up legacy local mock cycle IDs (e.g. sess_init, sess_1788764363241) without crashing Postgres 22P02
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, deletedId: id, note: 'Local-only cycle removed.' }))
          return
        }

        const { error } = await supabase
          .from('allowance_sessions')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)

        res.statusCode = error ? 500 : 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(error ? { error: error.message } : { success: true, deletedId: id }))
        return
      }
    }

    // Backend AI Chatbot API
    if (req.url === '/api/chat' && req.method === 'POST') {
      const userId = req.headers['x-user-id']
      if (!userId) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Unauthorized: User ID is required' }))
        return
      }

      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { message } = JSON.parse(body || '{}')
          if (!message || !message.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Message is required.' }))
            return
          }

          const cleanMessage = message.trim()
          const lowerMsg = cleanMessage.toLowerCase()

          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

          // 1. Fetch user profile, active cycle, and transactions scoped strictly to userId
          const [userRes, cyclesRes, txsRes] = await Promise.all([
            supabase.from('app_users').select('id, first_name, last_name, username').eq('id', userId).maybeSingle(),
            supabase.from('allowance_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
          ])

          const user = userRes.data || { first_name: 'Student', username: 'user' }
          const displayName = user.first_name || user.username || 'Student'

          const cycles = cyclesRes.data || []
          const activeCycle = cycles.find(c => c.is_active || !c.closed_at) || cycles[0]
          const cycleName = activeCycle?.name || 'Current Allowance Cycle'
          const goalAmt = Number(activeCycle?.goal_amount || 0)
          const goalTitle = activeCycle?.goal_title || 'Savings'

          const txs = txsRes.data || []
          const totalIncome = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0)
          const totalExpense = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0)
          const availableBalance = totalIncome - totalExpense

          res.setHeader('Content-Type', 'application/json')

          // 2. Token-Saver Fast Path (Deterministic queries answered without hitting Gemini API)
          if (lowerMsg === 'balance' || lowerMsg === 'what is my balance' || lowerMsg === 'how much is my balance' || lowerMsg === 'how much money do i have' || lowerMsg === 'my balance') {
            res.statusCode = 200
            res.end(JSON.stringify({
              action: 'chat',
              reply: `Kumusta, ${displayName}! Your current available cash is **₱${availableBalance.toFixed(2)}** in **${cycleName}** (Total Added: ₱${totalIncome.toFixed(2)}, Total Spent: ₱${totalExpense.toFixed(2)}).`,
              meta: { tokenSaved: true }
            }))
            return
          }

          if (lowerMsg === 'recent expenses' || lowerMsg === 'show my expenses' || lowerMsg === 'my expenses') {
            const expenseList = txs.filter(t => t.type === 'expense').slice(0, 5)
            if (expenseList.length === 0) {
              res.statusCode = 200
              res.end(JSON.stringify({
                action: 'chat',
                reply: `You haven't recorded any expenses in **${cycleName}** yet! All **₱${availableBalance.toFixed(2)}** is intact.`,
                meta: { tokenSaved: true }
              }))
              return
            }
            const lines = expenseList.map(t => `* **${t.description || t.category}**: ₱${Number(t.amount).toFixed(2)} (${new Date(t.created_at).toLocaleDateString()})`).join('\n')
            res.statusCode = 200
            res.end(JSON.stringify({
              action: 'chat',
              reply: `Here are your recent expenses in **${cycleName}**:\n\n${lines}\n\nTotal spent so far: **₱${totalExpense.toFixed(2)}**.`,
              meta: { tokenSaved: true }
            }))
            return
          }

          // 3. Call Gemini Model (gemini-3.6-flash) for intelligent reasoning & transaction extraction
          const recentSnippet = txs.slice(0, 8).map(t => ({
            type: t.type,
            amount: Number(t.amount),
            description: t.description,
            category: t.category,
            date: t.created_at
          }))

          const systemPrompt = `You are Ctrl+Advisor, the intelligent, friendly, student-oriented financial coach in the Ctrl+Savings allowance tracker app at USTP (University of Science and Technology of Southern Philippines) in Cagayan de Oro.
User Profile:
- Name: ${displayName}
- Current Available Balance: ₱${availableBalance.toFixed(2)}
- Active Period/Cycle: "${cycleName}"
- Target Savings Goal: ₱${goalAmt.toFixed(2)} (${goalTitle})
- Recent transactions (up to 8): ${JSON.stringify(recentSnippet)}

Your Goals:
1. Detect financial actions:
   - When user spent money, bought items, paid fares/canteen, or received cash/allowance/remittance, classify as "add_transaction".
   - Support ONE OR MULTIPLE financial events in a single message (e.g. "my papa gave me 200 pesos but i spent 50 pesos" -> income: 200, expense: 50).
   - In "transactions", provide an array of objects. Each item must have:
     * "type": "expense" or "income"
     * "amount": positive number in Philippine Pesos
     * "description": short clean item name (e.g. "Allowance from Papa", "Coffee", "Jeepney Fare", "Snack Expense", "CS111 Materials")
     * "category": one of ["Food", "Transport", "School", "Bills", "Leisure", "Shopping", "Allowance", "Other"]
   - If an expense exceeds the user's available balance (₱${availableBalance.toFixed(2)}), clearly mention in your reply that it exceeds their available funds and ask if they are sure they want to record it.
2. For advice, analysis, savings ideas, or questions:
   - Classify as "chat". Provide friendly, empathetic, actionable student advice formatted nicely in Markdown with emojis.
   - Address ${displayName} warmly.

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
  "reply": "<friendly, clear message directly answering the user>"
}`

          const tryCallGemini = async (modelName) => {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`
            const response = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + `\n\nUser Message: "${cleanMessage}"` }] }],
                generationConfig: { responseMimeType: 'application/json' }
              })
            })
            const geminiData = await response.json()
            if (!response.ok) {
              throw new Error(geminiData.error?.message || `Gemini API returned ${response.status}`)
            }
            const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
            if (!candidateText) throw new Error('No text received from Gemini')
            return JSON.parse(candidateText)
          }

          try {
            let parsed
            try {
              parsed = await tryCallGemini('gemini-3.6-flash')
            } catch (e1) {
              console.warn('gemini-3.6-flash failed in dev middleware, trying gemini-3.5-flash:', e1.message)
              try {
                parsed = await tryCallGemini('gemini-3.5-flash')
              } catch (e2) {
                console.warn('gemini-3.5-flash failed, trying gemini-flash-latest:', e2.message)
                parsed = await tryCallGemini('gemini-flash-latest')
              }
            }

            if (parsed.action === 'add_transaction') {
              const rawList = Array.isArray(parsed.transactions)
                ? parsed.transactions
                : (parsed.transaction ? [parsed.transaction] : [])

              if (rawList.length > 0) {
                const validatedTxs = rawList.map(t => {
                  const isExp = t.type === 'expense'
                  return {
                    type: isExp ? 'expense' : 'income',
                    amount: Math.abs(Number(t.amount)) || 0,
                    description: t.description || (isExp ? 'Expense' : 'Income'),
                    category: t.category || (isExp ? 'Food' : 'Allowance')
                  }
                }).filter(t => t.amount > 0)

                const totalExpensesInBatch = validatedTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
                const totalIncomeInBatch = validatedTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
                const effectiveBalance = availableBalance + totalIncomeInBatch
                const exceedsBudget = totalExpensesInBatch > effectiveBalance
                const overAmount = exceedsBudget ? totalExpensesInBatch - effectiveBalance : 0

                res.statusCode = 200
                res.end(JSON.stringify({
                  action: 'add_transaction',
                  transactions: validatedTxs,
                  transaction: validatedTxs[0],
                  exceedsBudget,
                  overAmount,
                  reply: parsed.reply || `Recorded transactions for ${validatedTxs.map(t => t.description).join(', ')}.`
                }))
                return
              }
            }

            res.statusCode = 200
            res.end(JSON.stringify({
              action: parsed.action || 'chat',
              reply: parsed.reply || 'Here is what I found for your allowance.'
            }))
            return

          } catch (apiErr) {
            console.warn('Gemini API call failed in dev middleware:', apiErr.message)

            // Intelligent Fallback (Regex + heuristic parser if Gemini is 503 or offline)
            const expenseMatch = cleanMessage.match(/(?:bought|buy|spent|pay|paid|cost|worth|for)\s+(?:a\s+|an\s+)?([a-zA-Z\s]+?)\s+(?:for|worth)?\s*(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)/i) ||
                                 cleanMessage.match(/(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)?\s+(?:for|on)\s+([a-zA-Z\s]+)/i)

            const incomeMatch = cleanMessage.match(/(?:received|got|added|allowance|deposit|given|gave me)\s+(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)/i) ||
                                cleanMessage.match(/(?:₱|p|pesos?|php)?\s*(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)?\s+(?:allowance|income|baon)/i)

            const fallbackTxs = []

            if (incomeMatch) {
              const amt = parseFloat(incomeMatch[1])
              if (!isNaN(amt) && amt > 0) {
                fallbackTxs.push({
                  type: 'income',
                  amount: amt,
                  description: cleanMessage.includes('papa') ? 'Allowance from Papa' : (cleanMessage.includes('mama') ? 'Allowance from Mama' : 'Allowance Deposit'),
                  category: 'Allowance'
                })
              }
            }

            if (expenseMatch) {
              let desc = expenseMatch[1]
              let amt = parseFloat(expenseMatch[2])
              if (isNaN(amt)) {
                amt = parseFloat(expenseMatch[1])
                desc = expenseMatch[2]
              }
              if (!isNaN(amt) && amt > 0) {
                desc = (desc || 'Expense').trim()
                let cat = 'Food'
                const dLow = desc.toLowerCase()
                if (dLow.includes('jeep') || dLow.includes('fare') || dLow.includes('bus') || dLow.includes('taxi') || dLow.includes('angkas')) cat = 'Transport'
                else if (dLow.includes('book') || dLow.includes('print') || dLow.includes('school') || dLow.includes('project')) cat = 'School'

                fallbackTxs.push({
                  type: 'expense',
                  amount: amt,
                  description: desc,
                  category: cat
                })
              }
            }

            if (fallbackTxs.length > 0) {
              const totalExp = fallbackTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              const totalInc = fallbackTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
              const effectiveBal = availableBalance + totalInc
              const exceeds = totalExp > effectiveBal
              const overAmt = exceeds ? totalExp - effectiveBal : 0

              res.statusCode = 200
              res.end(JSON.stringify({
                action: 'add_transaction',
                transactions: fallbackTxs,
                transaction: fallbackTxs[0],
                exceedsBudget: exceeds,
                overAmount: overAmt,
                reply: `Got it, ${displayName}! I've extracted: ${fallbackTxs.map(t => `${t.type === 'income' ? '+' : '-'}₱${t.amount.toFixed(2)} (${t.description})`).join(', ')}.`,
                fallbackMode: true
              }))
              return
            }

            res.statusCode = 502
            res.end(JSON.stringify({ error: `Gemini API Error: ${apiErr.message}` }))
            return
          }

        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Server error processing chat request.' }))
        }
      })
      return
    }

    // Health Route
    if (req.url === '/api/health') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'ok', app: 'Ctrl+Savings' }))
      return
    }
    
    next()
  }

  return {
    name: 'api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(apiMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware)
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      svelte(),
      tailwindcss(),
      apiDevPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'Logo.png'],
        manifest: {
          name: 'Ctrl+Savings',
          short_name: 'Ctrl+Savings',
          description: 'A zero-lag, offline-first allowance & savings tracker.',
          theme_color: '#062c1d',
          background_color: '#031a11',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/Logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/Logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        }
      })
    ],
  }
})
