<script>
  import { tick } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import AppIcon from './AppIcon.svelte'

  let {
    theme = 'light',
    userName = 'User',
    userId = '',
    availableBudget = 0,
    totalIncome = 0,
    totalExpense = 0,
    budgetPeriod = 'weekly',
    selectedSession = null,
    transactions = [],
    onAddTransaction = async () => ({ success: true }),
    onBack = () => {}
  } = $props()

  let chatContainer = $state(null)
  let inputText = $state('')
  let isTyping = $state(false)
  let actionLoadingId = $state(null)

  const quickPrompts = [
    { title: 'Coffee ₱100', iconName: 'coffee', prompt: 'I bought coffee for 100 pesos' },
    { title: 'Jeepney ₱15', iconName: 'transport', prompt: 'Paid 15 pesos for jeepney fare' },
    { title: 'Check Balance', iconName: 'allowance', prompt: 'What is my current balance?' },
    { title: 'Stretch My Baon', iconName: 'lightbulb', prompt: 'How can I stretch my remaining allowance for this cycle?' },
    { title: 'Spending Analysis', iconName: 'chart', prompt: 'Analyze my spending habits and tell me where my money is going.' },
    { title: 'Hit Savings Goal', iconName: 'target', prompt: 'What is the fastest way to achieve my cycle savings goal?' }
  ]

  let chatStorageKey = $derived(`ctrl_savings_chat_${userId || 'guest'}`)

  let messages = $state([])

  // Load chat history from localStorage on startup
  $effect(() => {
    if (messages.length === 0) {
      let savedMessages = null
      try {
        const raw = localStorage.getItem(chatStorageKey)
        if (raw) savedMessages = JSON.parse(raw)
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }

      if (Array.isArray(savedMessages) && savedMessages.length > 0) {
        messages = savedMessages
      } else {
        messages = [
          {
            id: 'msg_welcome',
            role: 'assistant',
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            text: `Kumusta, ${userName}! 👋 I'm **Ctrl+Advisor**, your personal AI financial coach powered by Gemini.\n\nI have live context of your **${selectedSession?.name || 'Active Cycle'}** with **₱${Number(availableBudget).toFixed(2)}** currently available for this **${budgetPeriod}** allowance cycle.\n\n💡 *Tip: You can talk naturally! E.g. "I bought coffee for 100 pesos", "Paid 15 pesos for jeepney", or ask for savings advice.*`
          }
        ]
      }
    }
  })

  // Persist messages to localStorage whenever changed
  $effect(() => {
    if (messages.length > 0) {
      try {
        // Keep up to 60 most recent messages locally
        const toSave = messages.slice(-60)
        localStorage.setItem(chatStorageKey, JSON.stringify(toSave))
      } catch (e) {
        console.error('Failed to save chat history:', e)
      }
    }
  })

  function scrollToBottom() {
    tick().then(() => {
      if (chatContainer) {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' })
      }
    })
  }

  function handleQuickPrompt(pText) {
    inputText = pText
    handleSubmit()
  }

  function clearChat() {
    try {
      localStorage.removeItem(chatStorageKey)
    } catch (e) {}

    messages = [
      {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        text: `Chat reset. I'm ready! How can I help you manage your allowance today, ${userName}?`
      }
    ]
  }

  function generateSmartResponse(userQuery) {
    const q = userQuery.toLowerCase()
    const bal = Number(availableBudget)
    const inc = Number(totalIncome)
    const exp = Number(totalExpense)
    const cycleName = selectedSession?.name || 'this cycle'
    const goalAmt = Number(selectedSession?.goalAmount || selectedSession?.goal_amount || 0)
    const goalTitle = selectedSession?.goalTitle || selectedSession?.goal_title || 'Savings Goal'

    const expenseTx = transactions.filter(t => t.type === 'expense')
    const catTotals = {}
    expenseTx.forEach(t => {
      const c = t.category || 'General'
      catTotals[c] = (catTotals[c] || 0) + Number(t.amount)
    })
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    const topCat = sortedCats.length > 0 ? sortedCats[0][0] : 'General Expenses'
    const topCatAmt = sortedCats.length > 0 ? sortedCats[0][1] : 0

    if (q.includes('stretch') || q.includes('baon') || q.includes('remaining') || q.includes('last')) {
      if (budgetPeriod === 'monthly') {
        const weeklyPace = (bal / 4).toFixed(2)
        const daily30 = (bal / 30).toFixed(2)
        return `### 💡 Smart Monthly Baon Allocation Strategy\n\nWith **₱${bal.toFixed(2)}** remaining in your **monthly** cycle (${cycleName}):\n\n* **Weekly Target**: ~₱${weeklyPace} / week\n* **Daily Target**: ~₱${daily30} / day (30 days)\n\n**Quick Hacks to Stretch It:**\n1. **Weekly Envelope Method**: Divide remaining baon into 4 equal envelopes or e-wallet pockets.\n2. **Bring a Water Tumbler**: Avoid buying bottled drinks or iced coffee during class (saves ~₱35-₱80/day).\n3. **Canteen First**: Campus canteens are almost always 30-50% cheaper than off-campus convenience stores.`
      } else {
        const daily5 = (bal / 5).toFixed(2)
        const daily7 = (bal / 7).toFixed(2)
        return `### 💡 Smart Weekly Baon Allocation Strategy\n\nWith **₱${bal.toFixed(2)}** remaining in your **weekly** cycle (${cycleName}):\n\n* **5-Day School Week**: ₱${daily5} / day\n* **7-Day Full Week**: ₱${daily7} / day\n\n**Quick Hacks to Stretch It:**\n1. **Bring a Water Tumbler**: Avoid buying bottled drinks or iced coffee during class (saves ~₱35-₱80/day).\n2. **Group Meals**: Splitting jeepney fares or buying value meals with friends reduces individual outlay.\n3. **Canteen First**: Campus canteens are almost always 30-50% cheaper than off-campus convenience stores.`
      }
    }

    if (q.includes('analyz') || q.includes('habit') || q.includes('where') || q.includes('spending')) {
      if (expenseTx.length === 0) {
        return `You have no recorded expenses in **${cycleName}** yet! All **₱${inc.toFixed(2)}** added is intact. Keep tracking each purchase so I can highlight your spending patterns.`
      }
      return `### 📊 Live Spending Breakdown\n\n* **Total Allowance Received**: ₱${inc.toFixed(2)}\n* **Total Spent So Far**: ₱${exp.toFixed(2)} (${inc > 0 ? Math.round((exp / inc) * 100) : 0}% of allowance)\n* **Top Spending Category**: **${topCat}** (₱${topCatAmt.toFixed(2)})\n\n**Coach's Observation:**\nYour highest cash outflow is **${topCat}**. If you curb this category by just 15%, you'll easily preserve an extra **₱${(topCatAmt * 0.15).toFixed(2)}** before your next cycle cutoff!`
    }

    if (q.includes('goal') || q.includes('target') || q.includes('save') || q.includes('fast')) {
      if (goalAmt > 0) {
        const progress = Math.min(100, Math.round((bal / goalAmt) * 100))
        return `### 🎯 Goal Tracker: "${goalTitle}"\n\n* **Target Amount**: ₱${goalAmt.toFixed(2)}\n* **Current Saved Balance**: ₱${bal.toFixed(2)}\n* **Progress**: **${progress}% achieved**\n\n${bal >= goalAmt 
          ? `🎉 **You already hit your target!** Consider closing this cycle and starting a new goal to protect your hard-earned savings.` 
          : `You are only **₱${(goalAmt - bal).toFixed(2)}** away! Try locking away ₱50 from each day's baon into a physical envelope or separate e-wallet stash so you aren't tempted to spend it.`}`
      }
      return `### 🎯 Setting a Target\n\nYou haven't configured a savings goal for **${cycleName}** yet. Open the **📁 Cycles** menu in the top bar to set a target (e.g. *₱500 for Emergency Stash*). Having an explicit target gamifies saving and prevents impulsive spending!`
    }

    if (q.includes('daily') || q.includes('limit') || q.includes('calculate')) {
      const perDay = budgetPeriod === 'monthly' ? (bal / 30).toFixed(2) : (bal / 5).toFixed(2)
      return `### 📅 Recommended Daily Allowance Cap\n\nBased on your active **${budgetPeriod}** balance of **₱${bal.toFixed(2)}**:\n\n* **Safe Daily Cap**: **₱${perDay}** (${budgetPeriod === 'monthly' ? '30-day month' : '5 school days'})\n* **Emergency Cushion**: Keep **₱${(bal * 0.1).toFixed(2)}** (10%) untouched for sudden photocopy, printing, or fare increases.\n\nStick to ₱${perDay} tomorrow and note your transactions right after buying so your circular gauge stays in the green!`
    }

    return `### 🤖 Ctrl+Advisor Insights\n\nGot it, ${userName}! Regarding "${userQuery.trim()}":\n\nAs a student managing allowance, the golden rule is **Pay Yourself First**:\n1. When allowance arrives, immediately stash away 10-20% before touching the rest.\n2. Always track small purchases—₱20 snacks and ₱15 jeepney trips add up faster than big purchases.\n3. Your current wallet has **₱${bal.toFixed(2)}**. Keep logging every transaction to maintain full control of your baon!`
  }

  async function handleConfirmExpense(msg) {
    const list = Array.isArray(msg.pendingTransactions)
      ? msg.pendingTransactions
      : (msg.pendingTransaction ? [msg.pendingTransaction] : [])
    if (list.length === 0 || msg.confirmed || msg.cancelled) return
    actionLoadingId = msg.id
    try {
      const errors = []
      for (const t of list) {
        const res = await onAddTransaction(t)
        if (res && !res.success) errors.push(res.error)
      }
      if (errors.length === 0) {
        msg.confirmed = true
      } else {
        msg.addError = errors.join('; ')
      }
    } catch (err) {
      msg.addError = err.message
    } finally {
      actionLoadingId = null
      scrollToBottom()
    }
  }

  function handleCancelExpense(msg) {
    msg.cancelled = true
    scrollToBottom()
  }

  async function handleSubmit() {
    const text = inputText.trim()
    if (!text || isTyping) return

    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      text
    }

    messages = [...messages, userMsg]
    inputText = ''
    scrollToBottom()

    isTyping = true

    try {
      // Send last 8 conversation turns as context for consistency
      const historyPayload = messages
        .filter(m => !m.isError && m.id !== 'msg_welcome')
        .slice(-8)
        .map(m => ({
          role: m.role,
          text: m.text
        }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          sessionId: selectedSession?.id || '',
          sessionName: selectedSession?.name || 'Active Cycle',
          sessionGoalAmount: Number(selectedSession?.goal_amount || selectedSession?.goalAmount || 0),
          sessionGoalTitle: selectedSession?.goal_title || selectedSession?.goalTitle || '',
          availableBudget: Number(availableBudget || 0),
          totalIncome: Number(totalIncome || 0),
          totalExpense: Number(totalExpense || 0),
          budgetPeriod: budgetPeriod || 'weekly'
        })
      })

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))

      if (!res.ok) {
        // Zero gatekeeping: render the actual error directly in the chat!
        const errorMsg = {
          id: 'msg_bot_' + Date.now(),
          role: 'assistant',
          isError: true,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          text: `⚠️ **API Error (${res.status})**: ${data.error || res.statusText || 'Unable to connect to AI Advisor'}`
        }
        messages = [...messages, errorMsg]
        return
      }

      // Handle actions
      if (data.action === 'add_transaction') {
        const rawList = Array.isArray(data.transactions)
          ? data.transactions
          : (data.transaction ? [data.transaction] : [])

        // Deduplication safeguard: drop accidental duplicates unless explicitly requested by user
        const seenKeys = new Set()
        const txList = rawList.filter(t => {
          const key = `${t.type}_${t.amount}_${(t.description || '').toLowerCase()}`
          if (seenKeys.has(key)) {
            const hasMultiple = /\b(2|3|4|two|three|four|both|pair|twice|double|separate)\b/i.test(text)
            if (!hasMultiple) return false
          }
          seenKeys.add(key)
          return true
        })

        if (txList.length > 0) {
          if (data.exceedsBudget) {
            // Budget exceeded: Prompt user with confirmation card!
            const botMsg = {
              id: 'msg_bot_' + Date.now(),
              role: 'assistant',
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              text: data.reply,
              isOverBudgetWarning: true,
              pendingTransactions: txList,
              pendingTransaction: txList[0],
              overAmount: Number(data.overAmount || 0),
              currentBalance: Number(availableBudget),
              confirmed: false,
              cancelled: false
            }
            messages = [...messages, botMsg]
          } else {
            // Within budget: automatically log all transactions!
            const errors = []
            for (const t of txList) {
              const addRes = await onAddTransaction(t)
              if (addRes && !addRes.success) {
                errors.push(addRes.error || `Failed to save ${t.description}`)
              }
            }
            const botMsg = {
              id: 'msg_bot_' + Date.now(),
              role: 'assistant',
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              text: data.reply,
              recordedTransactions: txList,
              recordedTransaction: txList[0],
              addError: errors.length > 0 ? errors.join('; ') : null
            }
            messages = [...messages, botMsg]
          }
        } else {
          // No transactions extracted
          const botMsg = {
            id: 'msg_bot_' + Date.now(),
            role: 'assistant',
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            text: data.reply || 'No transactions detected.'
          }
          messages = [...messages, botMsg]
        }
      } else {
        // Chat advice or analysis reply
        const botMsg = {
          id: 'msg_bot_' + Date.now(),
          role: 'assistant',
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          text: data.reply || 'I am ready to help you budget.'
        }
        messages = [...messages, botMsg]
      }

    } catch (networkErr) {
      console.error('Network call failed:', networkErr)
      const botMsg = {
        id: 'msg_bot_' + Date.now(),
        role: 'assistant',
        isError: true,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        text: `⚠️ **Connection Error**: Could not reach the AI service (${networkErr.message}). Please ensure the local server is running on http://localhost:4173.`
      }
      messages = [...messages, botMsg]
    } finally {
      isTyping = false
      scrollToBottom()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
</script>

<div class="w-full flex-1 flex flex-col min-h-0 max-w-2xl mx-auto px-4 sm:px-6 pb-2 pt-1 animate-in fade-in duration-200">
  
  <!-- Header Bar -->
  <div class="flex items-center justify-between pb-3 border-b {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/80'} shrink-0">
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={onBack}
        aria-label="Back to Home"
        class="cursor-pointer w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-xs {theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-[#0a4733] hover:bg-zinc-50'}"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="flex items-center gap-2.5">
        <div class="relative w-9 h-9 rounded-2xl flex items-center justify-center font-black text-base shadow-sm {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
          🤖
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] ring-2 {theme === 'dark' ? 'ring-black' : 'ring-white'}"></span>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <h2 class="text-base font-black tracking-tight leading-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
              Ctrl+Advisor
            </h2>
            <span class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full {theme === 'dark' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-[#0a4733]'}">
              AI Coach
            </span>
          </div>
          <p class="text-[11px] font-semibold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
            Student Financial Copilot
          </p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <button
      type="button"
      title="Clear conversation"
      onclick={clearChat}
      class="cursor-pointer text-xs font-bold py-1.5 px-3 rounded-full border transition-all active:scale-95 shadow-2xs {theme === 'dark' ? 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500' : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'}"
    >
      Clear
    </button>
  </div>

  <!-- Live Financial Context Strip -->
  <div class="my-2 py-2 px-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-2xs shrink-0 {theme === 'dark' ? 'bg-[#121215] border-zinc-800/80 text-zinc-300' : 'bg-emerald-50/60 border-emerald-200/60 text-[#0a4733]'}">
    <div class="flex items-center gap-2 truncate">
      <span class="text-sm">📁</span>
      <span class="truncate">{selectedSession?.name || 'Current Cycle'}</span>
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      <span class="text-[10px] uppercase font-black text-zinc-400">Cash:</span>
      <span class="font-black text-xs {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">₱{Number(availableBudget).toFixed(2)}</span>
    </div>
  </div>

  <!-- Chat Messages Stream -->
  <div
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto min-w-0 pr-1 flex flex-col gap-3.5 my-1"
  >
    {#each messages as msg (msg.id)}
      <div
        in:fly={{ y: 8, duration: 180, easing: cubicOut }}
        class="flex flex-col gap-1 {msg.role === 'user' ? 'items-end' : 'items-start'}"
      >
        <div class="flex items-end gap-2 max-w-[88%] sm:max-w-[80%] {msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}">
          
          {#if msg.role === 'assistant'}
            <div class="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs shadow-xs {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
              🤖
            </div>
          {/if}

          <div
            class="rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs {msg.role === 'user'
              ? 'bg-[#0a4733] text-white rounded-br-xs font-medium'
              : (msg.isError
                ? 'bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200 rounded-bl-xs'
                : (theme === 'dark' 
                  ? 'bg-[#18181b] border border-zinc-800 text-zinc-200 rounded-bl-xs' 
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-xs'))}"
          >
            <!-- Render formatted text (handles markdown headers, lists, and bold) -->
            {#each msg.text.split('\n') as line}
              {#if line.startsWith('### ')}
                <h4 class="font-black text-sm my-1 tracking-tight {msg.role === 'user' ? 'text-white' : (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]')}">
                  {line.replace('### ', '')}
                </h4>
              {:else if line.startsWith('* ') || line.startsWith('- ')}
                <div class="flex items-start gap-1.5 my-0.5 ml-1">
                  <span class="text-emerald-500 font-bold">•</span>
                  <span>
                    {@html line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')}
                  </span>
                </div>
              {:else if line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')}
                <div class="flex items-start gap-1.5 my-0.5 ml-1">
                  <span class="text-emerald-500 font-bold shrink-0">{line.slice(0, 3)}</span>
                  <span>
                    {@html line.slice(3).replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')}
                  </span>
                </div>
              {:else if line.trim() === ''}
                <div class="h-1.5"></div>
              {:else}
                <p class="my-0.5">
                  {@html line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')}
                </p>
              {/if}
            {/each}

            <!-- Auto-Logged Transaction Receipt(s) -->
            {#if msg.recordedTransactions && msg.recordedTransactions.length > 0}
              <div class="flex flex-col gap-1.5 mt-2.5">
                {#each msg.recordedTransactions as recTx}
                  <div class="p-2.5 rounded-xl border {theme === 'dark' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-[#0a4733]'} flex items-center justify-between shadow-2xs">
                    <div class="flex items-center gap-2">
                      <span class="w-7 h-7 rounded-lg flex items-center justify-center {theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-[#0a4733]'} text-xs font-black">
                        {recTx.type === 'expense' ? '💸' : '💰'}
                      </span>
                      <div>
                        <p class="font-bold text-xs leading-tight">{recTx.description}</p>
                        <span class="text-[10px] opacity-75">{recTx.category || 'General'}</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-black text-xs {recTx.type === 'expense' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                        {recTx.type === 'expense' ? '-' : '+'}₱{Number(recTx.amount).toFixed(2)}
                      </p>
                      <span class="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                    </div>
                  </div>
                {/each}
              </div>
              {#if msg.addError}
                <p class="text-[10px] text-rose-500 font-bold mt-1">⚠️ Note: {msg.addError}</p>
              {/if}
            {:else if msg.recordedTransaction}
              <div class="mt-2.5 p-2.5 rounded-xl border {theme === 'dark' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-[#0a4733]'} flex items-center justify-between shadow-2xs">
                <div class="flex items-center gap-2">
                  <span class="w-7 h-7 rounded-lg flex items-center justify-center {theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-[#0a4733]'} text-xs font-black">
                    {msg.recordedTransaction.type === 'expense' ? '💸' : '💰'}
                  </span>
                  <div>
                    <p class="font-bold text-xs leading-tight">{msg.recordedTransaction.description}</p>
                    <span class="text-[10px] opacity-75">{msg.recordedTransaction.category || 'General'}</span>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-black text-xs {msg.recordedTransaction.type === 'expense' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                    {msg.recordedTransaction.type === 'expense' ? '-' : '+'}₱{Number(msg.recordedTransaction.amount).toFixed(2)}
                  </p>
                  <span class="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                </div>
              </div>
              {#if msg.addError}
                <p class="text-[10px] text-rose-500 font-bold mt-1">⚠️ Note: {msg.addError}</p>
              {/if}
            {/if}

            <!-- Over-Budget Interactive Warning Card -->
            {#if msg.isOverBudgetWarning}
              {#if !msg.confirmed && !msg.cancelled}
                <div class="mt-3 p-3 rounded-xl border-2 {theme === 'dark' ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'} flex flex-col gap-2.5 shadow-sm">
                  <div class="flex items-start gap-2">
                    <span class="text-base">⚠️</span>
                    <div>
                      <h5 class="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Budget Limit Warning</h5>
                      <p class="text-[11px] font-medium opacity-90">
                        Exceeds current balance of <strong>₱{Number(msg.currentBalance).toFixed(2)}</strong> by <strong class="text-rose-600 dark:text-rose-400">₱{Number(msg.overAmount).toFixed(2)}</strong>.
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-col gap-1">
                    {#each (msg.pendingTransactions || [msg.pendingTransaction]) as ptx}
                      <div class="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 font-semibold">
                        <span>{ptx.type === 'expense' ? '💸 Expense' : '💰 Income'}: <strong>{ptx.description}</strong></span>
                        <span class="font-black {ptx.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                          {ptx.type === 'expense' ? '-' : '+'}₱{Number(ptx.amount).toFixed(2)}
                        </span>
                      </div>
                    {/each}
                  </div>

                  <p class="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                    You do not have enough money. Are you sure you want to continue?
                  </p>

                  <div class="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onclick={() => handleConfirmExpense(msg)}
                      disabled={actionLoadingId === msg.id}
                      class="cursor-pointer flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                    >
                      {#if actionLoadingId === msg.id}
                        <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Recording...</span>
                      {:else}
                        <span>✓ Yes, Record Expense</span>
                      {/if}
                    </button>
                    <button
                      type="button"
                      onclick={() => handleCancelExpense(msg)}
                      disabled={actionLoadingId === msg.id}
                      class="cursor-pointer py-1.5 px-3 rounded-lg text-xs font-bold border transition-all active:scale-95 shadow-2xs {theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'}"
                    >
                      Cancel
                    </button>
                  </div>
                  {#if msg.addError}
                    <p class="text-[10px] text-rose-500 font-bold">⚠️ {msg.addError}</p>
                  {/if}
                </div>
              {:else if msg.confirmed}
                <div class="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
                  <span>✅</span>
                  <span>Confirmed: Recorded transactions to database.</span>
                </div>
              {:else if msg.cancelled}
                <div class="mt-2.5 p-2 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <span>🚫</span>
                  <span>Cancelled: Transactions were not recorded.</span>
                </div>
              {/if}
            {/if}
          </div>
        </div>

        <span class="text-[9px] font-semibold text-zinc-400 px-1 {msg.role === 'user' ? 'pr-2' : 'pl-9'}">
          {msg.time}
        </span>
      </div>
    {/each}

    {#if isTyping}
      <div
        in:fade={{ duration: 150 }}
        class="flex items-end gap-2"
      >
        <div class="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'} shadow-xs">
          🤖
        </div>
        <div class="rounded-2xl rounded-bl-xs px-4 py-3 border flex items-center gap-1.5 {theme === 'dark' ? 'bg-[#18181b] border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'} shadow-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]"></span>
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]"></span>
          <span class="text-[10px] font-bold text-zinc-400 ml-1">Ctrl+Advisor is typing...</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Quick Suggestion Chips Carousel -->
  {#if messages.length <= 2}
    <div class="py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
      {#each quickPrompts as qp}
        <button
          type="button"
          onclick={() => handleQuickPrompt(qp.prompt)}
          class="cursor-pointer whitespace-nowrap flex items-center gap-1.5 py-1 px-3 rounded-full border text-xs font-semibold shadow-2xs transition-all active:scale-95 hover:border-emerald-500 {theme === 'dark' ? 'bg-[#18181b] border-zinc-800 text-zinc-300 hover:text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:text-[#0a4733]'}"
        >
          <AppIcon name={qp.iconName} size={13} />
          <span>{qp.title}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Message Input Bar (Sleek, rounded pill with send trigger) -->
  <form
    onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}
    class="relative mt-1 flex items-center gap-2 p-1.5 rounded-2xl border shadow-lg shrink-0 {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}"
  >
    <input
      type="text"
      bind:value={inputText}
      onkeydown={handleKeyDown}
      placeholder="Ask Ctrl+Advisor anything about your money..."
      class="flex-1 bg-transparent px-3 py-2 text-xs font-medium focus:outline-none {theme === 'dark' ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'}"
    />

    <button
      type="submit"
      disabled={!inputText.trim() || isTyping}
      aria-label="Send Message"
      class="cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed {theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-[#0a4733] hover:bg-[#0d5940] text-white'}"
    >
      <svg class="w-4 h-4 translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  </form>

  <p class="text-[10px] text-center text-zinc-400 dark:text-zinc-600 mt-1 font-medium shrink-0">
    Ctrl+Advisor provides student financial guidance. Always verify key decisions.
  </p>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
