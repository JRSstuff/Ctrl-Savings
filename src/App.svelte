<script>
  import { onMount } from 'svelte'
  import { fade, fly, scale } from 'svelte/transition'
  import { cubicOut, expoInOut } from 'svelte/easing'
  import TopBar from './lib/components/TopBar.svelte'
  import Gauge from './lib/components/Gauge.svelte'
  import BottomNav from './lib/components/BottomNav.svelte'
  import SavingsView from './lib/components/SavingsView.svelte'
  import ChatbotView from './lib/components/ChatbotView.svelte'
  import ProfileView from './lib/components/ProfileView.svelte'
  import AddModal from './lib/components/AddModal.svelte'
  import SessionModal from './lib/components/SessionModal.svelte'
  import AuthView from './lib/components/AuthView.svelte'
  import AppIcon from './lib/components/AppIcon.svelte'

  // Application Constants & State
  const APP_VERSION = 'v1.2.0'
  let appLoaded = $state(false)
  let activeTab = $state('home') // 'home', 'chatbot', 'savings', 'profile', 'settings'
  let theme = $state(typeof window !== 'undefined' ? (localStorage.getItem('ctrl_savings_theme') || 'light') : 'light')
  let isAddModalOpen = $state(false)
  let isSessionModalOpen = $state(false)
  let deferredPrompt = $state(null)
  let isInstalled = $state(false)
  let isDismissed = $state(false)

  // Zero-Gatekeeping Error State
  let apiErrorMessage = $state('')

  // Authentication State (stored as user UUID in allowance_user_id)
  let session = $state(
    typeof window !== 'undefined'
      ? (localStorage.getItem('allowance_user_id') || null)
      : null
  )

  // Edit Budget Modal State (Replaces JavaScript prompt)
  let isEditBudgetModalOpen = $state(false)
  let editBudgetAmount = $state('')
  let editBudgetAction = $state('goal') // 'goal' (set target limit) or 'income' (log new baon)
  let isSubmittingBudget = $state(false)

  // Safety Spend Limit State (Replaces JavaScript prompt)
  let isSafetyLimitModalOpen = $state(false)
  let safetyLimitInput = $state('')
  let safetySpendLimit = $state(
    typeof window !== 'undefined'
      ? parseFloat(localStorage.getItem('ctrl_savings_safety_limit') || '150.00')
      : 150.00
  )

  function updateSafetyLimit(newVal) {
    safetySpendLimit = newVal
    try {
      localStorage.setItem('ctrl_savings_safety_limit', newVal.toString())
    } catch(e) {}
  }

  // Welcome Screen State
  let showWelcome = $state(false)
  let welcomeName = $state(
    typeof window !== 'undefined'
      ? (localStorage.getItem('allowance_firstname') || '')
      : ''
  )

  // Allowance Cycles & Transactions State (Fetched live from Supabase)
  let sessions = $state([])
  let activeSessionId = $state('')
  let selectedSessionId = $state('')
  let transactions = $state([])
  let sortOrder = $state('desc') // 'desc' (newest first) or 'asc' (oldest first)
  let confirmDeleteTxId = $state(null)
  let isDeletingTxId = $state(null)

  // Allowance Specification: 'weekly' or 'monthly'
  let budgetPeriod = $state('weekly')
  try {
    const savedPeriod = localStorage.getItem('ctrl_savings_budget_period')
    if (savedPeriod === 'weekly' || savedPeriod === 'monthly') {
      budgetPeriod = savedPeriod
    }
  } catch(e) {}

  function setBudgetPeriod(newPeriod) {
    if (newPeriod === 'weekly' || newPeriod === 'monthly') {
      budgetPeriod = newPeriod
      try {
        localStorage.setItem('ctrl_savings_budget_period', newPeriod)
      } catch(e) {}
    }
  }

  function toggleBudgetPeriod() {
    setBudgetPeriod(budgetPeriod === 'weekly' ? 'monthly' : 'weekly')
  }

  // Active Session & Derived Budget Calculations
  let selectedSession = $derived(
    sessions.find(s => s.id === selectedSessionId) ||
    sessions.find(s => s.is_active) ||
    sessions[0] ||
    null
  )

  // Filter transactions for selected cycle (with automatic fallback to all user transactions)
  let sessionTransactions = $derived.by(() => {
    if (!selectedSession || sessions.length <= 1) return transactions

    // Chronologically sort sessions to identify order
    const chronological = [...sessions].sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime()
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime()
      return timeA - timeB
    })

    const isEarliest = chronological[0]?.id === selectedSession.id
    const isLatest = chronological[chronological.length - 1]?.id === selectedSession.id
    const isActive = Boolean(selectedSession.is_active || selectedSession.id === activeSessionId)

    // Start time: earliest session includes all prior transactions from the beginning
    const start = isEarliest ? 0 : new Date(selectedSession.created_at || selectedSession.createdAt || 0).getTime()

    // End time: Active cycle, latest cycle, or unclosed cycle NEVER cuts off newly added transactions!
    const isArchivedPastCycle = !isActive && !isLatest && Boolean(selectedSession.closed_at || selectedSession.closedAt)
    const end = isArchivedPastCycle
      ? new Date(selectedSession.closed_at || selectedSession.closedAt).getTime()
      : Infinity

    const filtered = transactions.filter(t => {
      const tTime = new Date(t.created_at).getTime()
      return tTime >= start && tTime <= end
    })

    // If cycle was created after transactions or has none, return all transactions so money is 100% accurate
    if (filtered.length === 0) {
      return transactions
    }
    return filtered
  })

  // Sorted Transactions for Display
  let sortedTransactions = $derived.by(() => {
    return [...sessionTransactions].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })
  })

  // Dynamic Money Counters Calculated Authentically from Database Records
  let totalIncome = $derived(sessionTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0))
  let totalExpense = $derived(sessionTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0))
  let availableBudget = $derived(Math.max(0, totalIncome - totalExpense))
  let cycleGoal = $derived(Number(selectedSession?.goal_amount) || 0)
  let totalBudget = $derived(totalIncome > 0 ? totalIncome : (cycleGoal > 0 ? cycleGoal : (availableBudget > 0 ? availableBudget : 100)))
  let spentBudget = $derived(totalExpense)
  let percentSpent = $derived(totalBudget > 0 ? Math.min(100, Math.round((spentBudget / totalBudget) * 100)) : 0)

  // Student Daily Allowance Breakdown
  let dailyPace = $derived(budgetPeriod === 'weekly' ? availableBudget / 7 : availableBudget / 30)
  let schoolDailyPace = $derived(budgetPeriod === 'weekly' ? availableBudget / 5 : availableBudget / 20)

  // PWA banner visibility
  let showInstallBubble = $derived(!isInstalled && !isDismissed && appLoaded && !!session)

  // Lifecycle Initialization
  onMount(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true ||
                           document.referrer.includes('android-app://')
      if (isStandalone) {
        isInstalled = true
      }

      // In local development / preview on localhost, unregister stale service workers
      if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister())
        })
      }

      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault()
        deferredPrompt = e
      }
      const handleAppInstalled = () => {
        isInstalled = true
        deferredPrompt = null
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.addEventListener('appinstalled', handleAppInstalled)

      // Fast app reveal
      const timer = setTimeout(() => {
        appLoaded = true
      }, 250)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  })

  // Synchronize with database on session availability
  $effect(() => {
    if (session) {
      fetchUserProfile()
      fetchSessions()
      fetchTransactions()
    }
  })

  // API Call: Fetch User Profile
  async function fetchUserProfile() {
    if (!session) return
    try {
      const res = await fetch('/api/user', {
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok && result.data) {
        const u = result.data
        if (u.first_name) {
          welcomeName = u.first_name
          localStorage.setItem('allowance_firstname', u.first_name)
        }
        if (u.last_name) localStorage.setItem('allowance_lastname', u.last_name)
        if (u.middle_name) localStorage.setItem('allowance_middlename', u.middle_name)
        if (u.date_of_birth) localStorage.setItem('allowance_dob', u.date_of_birth)
        if (u.username) localStorage.setItem('allowance_username', u.username)
      } else if (!res.ok) {
        apiErrorMessage = `Load Profile Failed (${res.status}): ${result.error || res.statusText}`
      }
    } catch (e) {
      apiErrorMessage = `Network error fetching user profile: ${e.message}`
      console.error('Error fetching user profile:', e)
    }
  }

  // API Call: Activate a cycle in database
  async function handleActivateSession(sessionId) {
    if (!session || !sessionId) return
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session
        },
        body: JSON.stringify({
          id: sessionId,
          is_active: true,
          closed_at: null
        })
      })
      sessions = sessions.map(s => s.id === sessionId ? { ...s, is_active: true, closed_at: null } : { ...s, is_active: false })
      activeSessionId = sessionId
    } catch (e) {
      console.warn('Could not auto-activate session:', e.message)
    }
  }

  // API Call: Fetch Sessions (Allowance Cycles)
  async function fetchSessions() {
    if (!session) return
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok) {
        sessions = result.data || []
        const active = sessions.find(s => s.is_active)
        if (active) {
          activeSessionId = active.id
          if (!selectedSessionId) selectedSessionId = active.id
        } else if (sessions.length > 0) {
          activeSessionId = sessions[0].id
          if (!selectedSessionId) selectedSessionId = sessions[0].id
          // Self-heal: If no session is active, activate the latest session in DB!
          handleActivateSession(sessions[0].id)
        }
        apiErrorMessage = ''
      } else {
        apiErrorMessage = `Load Cycles Failed (${res.status}): ${result.error || res.statusText}`
      }
    } catch (e) {
      apiErrorMessage = `Network error fetching cycles: ${e.message}`
      console.error('Failed to fetch sessions:', e)
    }
  }

  // API Call: Fetch Transactions
  async function fetchTransactions() {
    if (!session) return
    try {
      const res = await fetch('/api/transactions', {
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok) {
        transactions = result.data || []
        apiErrorMessage = ''
      } else {
        apiErrorMessage = `Load Transactions Failed (${res.status}): ${result.error || res.statusText}`
      }
    } catch (e) {
      apiErrorMessage = `Network error fetching transactions: ${e.message}`
      console.error('Failed to fetch transactions:', e)
    }
  }

  // API Call: Add Transaction (Optimistic UI + Live Sync)
  async function handleAddTransaction(tx) {
    if (!session) return { success: false, error: 'User is not logged in' }
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session
        },
        body: JSON.stringify(tx)
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok) {
        if (result.data) {
          // Avoid duplicate insertion if already in transactions
          if (!transactions.some(t => t.id === result.data.id)) {
            transactions = [result.data, ...transactions]
          }
        }
        if (!selectedSessionId && activeSessionId) {
          selectedSessionId = activeSessionId
        }
        apiErrorMessage = ''
        return { success: true, data: result.data }
      } else {
        apiErrorMessage = `Add Transaction Failed (${res.status}): ${result.error || res.statusText}`
        return { success: false, error: apiErrorMessage }
      }
    } catch (e) {
      apiErrorMessage = `Add Transaction Network Error: ${e.message}`
      return { success: false, error: apiErrorMessage }
    }
  }

  // API Call: Delete Transaction
  async function handleDeleteTransaction(id) {
    confirmDeleteTxId = null
    isDeletingTxId = id
    const previousTransactions = [...transactions]
    transactions = transactions.filter(t => t.id !== id)

    try {
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      isDeletingTxId = null
      if (res.ok) {
        apiErrorMessage = ''
      } else {
        transactions = previousTransactions
        apiErrorMessage = `Delete Transaction Failed (${res.status}): ${result.error || res.statusText || 'Could not delete transaction'}`
      }
    } catch (e) {
      isDeletingTxId = null
      transactions = previousTransactions
      apiErrorMessage = `Network error deleting transaction: ${e.message}`
    }
  }

  // API Call: Start New Cycle
  async function handleStartNewSession(arg1, arg2, arg3, arg4) {
    if (!session) return { success: false, error: 'No active session' }
    let name = arg1
    let desc = arg2
    let goalAmt = arg3
    let goalTitle = arg4

    if (typeof arg1 === 'object' && arg1 !== null) {
      name = arg1.name
      desc = arg1.description
      goalAmt = arg1.goalAmount ?? arg1.goal_amount
      goalTitle = arg1.goalTitle ?? arg1.goal_title
    }

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session
        },
        body: JSON.stringify({
          name: typeof name === 'string' ? name.trim() : (name || ''),
          description: typeof desc === 'string' ? desc.trim() : (desc || ''),
          goal_amount: Number(goalAmt) || 0,
          goal_title: typeof goalTitle === 'string' ? goalTitle.trim() : (goalTitle || '')
        })
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok && result.data) {
        sessions = [result.data, ...sessions.map(s => ({ ...s, is_active: false }))]
        activeSessionId = result.data.id
        selectedSessionId = result.data.id
        apiErrorMessage = ''
        return { success: true, data: result.data }
      } else {
        const errMsg = result.error || res.statusText
        apiErrorMessage = `Create Cycle Failed (${res.status}): ${errMsg}`
        return { success: false, error: errMsg }
      }
    } catch (e) {
      apiErrorMessage = `Network error creating cycle: ${e.message}`
      return { success: false, error: e.message }
    }
  }

  // API Call: Edit Cycle
  async function handleEditSession(arg1, arg2) {
    if (!session) return { success: false, error: 'No active session' }
    let id, name, description, goal_amount, goal_title

    if (typeof arg1 === 'string') {
      id = arg1
      const payload = arg2 || {}
      name = payload.name
      description = payload.description
      goal_amount = payload.goal_amount ?? payload.goalAmount ?? 0
      goal_title = payload.goal_title ?? payload.goalTitle ?? ''
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      id = arg1.id
      name = arg1.name
      description = arg1.description
      goal_amount = arg1.goal_amount ?? arg1.goalAmount ?? 0
      goal_title = arg1.goal_title ?? arg1.goalTitle ?? ''
    }

    try {
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session
        },
        body: JSON.stringify({
          id,
          name: typeof name === 'string' ? name.trim() : name,
          description: typeof description === 'string' ? description.trim() : description,
          goal_amount: Number(goal_amount) || 0,
          goal_title: typeof goal_title === 'string' ? goal_title.trim() : goal_title
        })
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok && result.data) {
        sessions = sessions.map(s => s.id === id ? { ...s, ...result.data } : s)
        apiErrorMessage = ''
        return { success: true, data: result.data }
      } else {
        const errMsg = result.error || res.statusText
        apiErrorMessage = `Edit Cycle Failed (${res.status}): ${errMsg}`
        return { success: false, error: errMsg }
      }
    } catch (e) {
      apiErrorMessage = `Network error editing cycle: ${e.message}`
      return { success: false, error: e.message }
    }
  }

  // API Call: Delete Cycle
  async function handleDeleteSession(sessionId) {
    if (!session) return { success: false, error: 'No active session' }
    const prevSessions = [...sessions]
    sessions = sessions.filter(s => s.id !== sessionId)
    if (selectedSessionId === sessionId) {
      selectedSessionId = sessions[0]?.id || ''
    }
    if (activeSessionId === sessionId) {
      activeSessionId = sessions[0]?.id || ''
    }

    try {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok) {
        apiErrorMessage = ''
        if (sessions.length > 0 && !sessions.some(s => s.is_active)) {
          handleActivateSession(sessions[0].id)
        }
        return { success: true }
      } else {
        sessions = prevSessions
        const errMsg = result.error || res.statusText
        apiErrorMessage = `Delete Cycle Failed (${res.status}): ${errMsg}`
        return { success: false, error: errMsg }
      }
    } catch (e) {
      sessions = prevSessions
      apiErrorMessage = `Network error deleting cycle: ${e.message}`
      return { success: false, error: e.message }
    }
  }

  // Real UI Modal: Open Edit Budget Modal
  function openEditBudgetModal() {
    editBudgetAmount = totalBudget > 0 ? totalBudget.toString() : '500'
    editBudgetAction = 'goal'
    isEditBudgetModalOpen = true
  }

  // Real UI Modal: Save Budget (Replaces JS prompt)
  async function handleSaveEditBudget() {
    const val = parseFloat(editBudgetAmount)
    if (isNaN(val) || val <= 0) return

    isSubmittingBudget = true
    if (editBudgetAction === 'income') {
      // Add as new received allowance income transaction
      await handleAddTransaction({
        type: 'income',
        amount: val,
        description: '💰 Allowance',
        category: '💰 Allowance'
      })
    } else {
      // Set as target budget for the active cycle in Supabase
      if (selectedSession && selectedSession.id) {
        await handleEditSession({
          id: selectedSession.id,
          name: selectedSession.name,
          goal_amount: val,
          goal_title: selectedSession.goal_title || 'Target Budget'
        })
      } else {
        // Create initial cycle with this goal
        await handleStartNewSession('Allowance Cycle', 'Initial Cycle', val, 'Target Budget')
      }
    }
    isSubmittingBudget = false
    isEditBudgetModalOpen = false
  }

  // Real UI Modal: Open Safety Limit Modal
  function openSafetyLimitModal() {
    safetyLimitInput = safetySpendLimit > 0 ? safetySpendLimit.toString() : '150'
    isSafetyLimitModalOpen = true
  }

  // Real UI Modal: Save Safety Limit (Replaces JS prompt)
  function handleSaveSafetyLimit() {
    const val = parseFloat(safetyLimitInput)
    if (!isNaN(val) && val >= 0) {
      updateSafetyLimit(val)
    }
    isSafetyLimitModalOpen = false
  }

  // Handle Authentication Success
  function handleAuthSuccess(name) {
    session = localStorage.getItem('allowance_user_id')
    welcomeName = name || localStorage.getItem('allowance_firstname') || 'Student'
    showWelcome = true
    setTimeout(() => { showWelcome = false }, 3000)
    fetchSessions()
    fetchTransactions()
    fetchUserProfile()
  }

  // Handle Sign Out
  function handleLogout() {
    session = null
    try {
      localStorage.removeItem('allowance_user_id')
      localStorage.removeItem('allowance_username')
      localStorage.removeItem('allowance_firstname')
      localStorage.removeItem('allowance_lastname')
      localStorage.removeItem('allowance_middlename')
      localStorage.removeItem('allowance_dob')
      localStorage.removeItem('ctrl_savings_user')
    } catch(e) {}
    activeTab = 'home'
    transactions = []
    sessions = []
  }

  // PWA Installation Trigger
  async function handleInstallPWA() {
    if (!deferredPrompt) {
      alert('To install this app:\n\n• iOS (Safari): Tap Share button -> "Add to Home Screen"\n• Android (Chrome): Tap options menu (⋮) -> "Install app"\n• Desktop: Click the install icon in your address bar.')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      isInstalled = true
    }
    deferredPrompt = null
  }

  // Helper formatting functions
  function formatDateTime(iso) {
    if (!iso) return 'Today'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return 'Today'
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch(e) {
      return 'Today'
    }
  }

  function getItemEmoji(item) {
    const text = `${item.category || ''} ${item.description || ''} ${item.title || ''}`.toLowerCase()
    if (item.type === 'income') return '💰'
    if (text.includes('coffee') || text.includes('cafe') || text.includes('tea')) return '☕'
    if (text.includes('food') || text.includes('burger') || text.includes('jollibee') || text.includes('canteen') || text.includes('lunch') || text.includes('dinner')) return '🍔'
    if (text.includes('jeep') || text.includes('transport') || text.includes('fare') || text.includes('angkas') || text.includes('commute')) return '🚌'
    if (text.includes('bill') || text.includes('light') || text.includes('electric') || text.includes('water')) return '💡'
    if (text.includes('save') || text.includes('bank') || text.includes('deposit')) return '🏦'
    if (text.includes('grocery') || text.includes('market') || text.includes('puregold') || text.includes('store')) return '🛒'
    if (text.includes('snack') || text.includes('bread') || text.includes('donut')) return '🍩'
    if (text.includes('school') || text.includes('print') || text.includes('book') || text.includes('paper') || text.includes('xerox')) return '📚'
    return '💸'
  }

  function cleanItemTitle(item) {
    const t = item.description || item.title || 'Transaction'
    return t.replace(/^[\p{Emoji}\s]+/u, '').trim() || t
  }

  function cleanCategory(item) {
    const c = item.category || (item.type === 'income' ? 'Allowance' : 'General')
    return c.replace(/^[\p{Emoji}\s]+/u, '').trim() || c
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light'
    try {
      localStorage.setItem('ctrl_savings_theme', theme)
    } catch(e) {}
  }
</script>

<div class="h-[100dvh] w-full overflow-hidden flex justify-center {theme === 'dark' ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f7f9f7] text-[#0a4733]'} relative font-sans antialiased selection:bg-emerald-500 selection:text-black">

  <!-- Zero-Gatekeeping Floating High-Priority Error Toast -->
  {#if apiErrorMessage}
    <div
      transition:fly={{ y: -40, duration: 250 }}
      class="fixed top-3 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[140] p-3 rounded-xl border shadow-xl flex items-start justify-between gap-3 text-xs {theme === 'dark' ? 'bg-[#2a0c0c] border-[#7f1d1d] text-[#f87171]' : 'bg-[#fef2f2] border-[#b91c1c] text-[#991b1b]'}"
      role="alert"
    >
      <div class="flex items-start gap-2 min-w-0">
        <span class="text-base leading-none shrink-0">⚠️</span>
        <div class="min-w-0">
          <strong class="block font-black uppercase tracking-wider text-[10px]">Database / Network Alert</strong>
          <p class="font-semibold break-words leading-tight mt-0.5">{apiErrorMessage}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          onclick={() => { apiErrorMessage = ''; fetchSessions(); fetchTransactions(); }}
          class="cursor-pointer text-[10px] font-bold px-2 py-1 rounded border active:scale-95 transition-all {theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-800'}"
        >
          Retry
        </button>
        <button
          onclick={() => apiErrorMessage = ''}
          class="cursor-pointer text-xs font-bold px-1.5 py-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      </div>
    </div>
  {/if}

  <!-- Fast Zero-Lag Loading Interface -->
  {#if !appLoaded}
    <div
      out:fade={{ duration: 200, easing: expoInOut }}
      class="absolute inset-0 z-[120] flex flex-col items-center justify-center p-6 {theme === 'dark' ? 'bg-[#09090b] text-white' : 'bg-[#f7f9f7] text-[#0a4733]'} select-none"
    >
      <div class="w-full max-w-xs flex flex-col items-center text-center p-6 rounded-2xl border shadow-lg {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 {theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-[#0a4733] border border-emerald-200'}">
          <svg class="w-7 h-7 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="3" />
            <path d="M16 12h.01" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <h1 class="text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Ctrl+Savings</h1>
        <p class="text-[11px] font-semibold text-zinc-400 mt-0.5">Allowance Tracker</p>
      </div>
    </div>
  {/if}

  <!-- Welcome Toast Notification -->
  {#if showWelcome}
    <div 
      transition:fly={{ y: -50, duration: 300 }}
      class="fixed top-4 z-[130] px-5 py-2.5 rounded-2xl shadow-xl border flex items-center gap-2.5 backdrop-blur-md {theme === 'dark' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-emerald-900/90 border-emerald-700 text-white'}"
    >
      <span class="text-lg">👋</span>
      <span class="text-xs font-bold tracking-tight">Welcome, {welcomeName || 'Student'}!</span>
    </div>
  {/if}

  <!-- Application Shell Frame -->
  <div class="relative w-full max-w-xl h-full flex flex-col justify-between min-w-0">
    
    <!-- TopBar & Logo: ONLY rendered when session exists (Removed completely from login screen!) -->
    {#if appLoaded && session}
      <div class="absolute z-[110] top-3.5 left-5 w-9 h-9 flex items-center justify-center pointer-events-none animate-in fade-in duration-300">
        <img src="/Logo.png" alt="Ctrl+Savings Logo" class="w-full h-full object-contain drop-shadow-md" />
      </div>

      <TopBar
        {theme}
        onToggleTheme={toggleTheme}
        onOpenSessions={() => isSessionModalOpen = true}
        activeSessionName={selectedSession?.name || 'Current Cycle'}
      />
    {/if}

    <!-- Main View Switcher -->
    {#if !session}
      <!-- Authentication Screen: Completely Clean, No TopBar or Cycle Button! -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 pt-12 pb-16 flex items-center justify-center">
        <AuthView {theme} onSuccess={handleAuthSuccess} />
      </div>
    {:else}
      <!-- Logged In Scrollable Body Content -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pb-32 pt-1 px-4 sm:px-6 scroll-smooth">

        {#if activeTab === 'home'}
          <main class="w-full flex flex-col gap-4 min-w-0 animate-in fade-in duration-200">

            <!-- Dashboard Header with Allowance Specification Toggle -->
            <div class="px-1 pt-1 flex items-end justify-between gap-2">
              <div class="min-w-0">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase {theme === 'dark' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-100/80 text-[#0a4733] border border-emerald-200'}">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {budgetPeriod === 'weekly' ? 'Weekly Active Budget' : 'Monthly Active Budget'}
                </span>
                <h2 class="text-2xl font-black tracking-tight mt-1 leading-none truncate {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                  {selectedSession?.name || 'Allowance Cycle'}
                </h2>
              </div>

              <!-- Specification Switcher Pill (Weekly vs Monthly) -->
              <div class="flex flex-col items-end gap-1 shrink-0">
                <div class="inline-flex p-0.5 rounded-xl border {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-zinc-100 border-zinc-200'}">
                  <button
                    type="button"
                    onclick={() => setBudgetPeriod('weekly')}
                    class="cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5 {budgetPeriod === 'weekly' ? (theme === 'dark' ? 'bg-emerald-500 text-black shadow-xs' : 'bg-[#0a4733] text-white shadow-xs') : (theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')}"
                    title="Track Weekly Balance"
                  >
                    <AppIcon name="weekly" size={13} />
                    <span>Weekly</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => setBudgetPeriod('monthly')}
                    class="cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5 {budgetPeriod === 'monthly' ? (theme === 'dark' ? 'bg-emerald-500 text-black shadow-xs' : 'bg-[#0a4733] text-white shadow-xs') : (theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')}"
                    title="Track Monthly Balance"
                  >
                    <AppIcon name="monthly" size={13} />
                    <span>Monthly</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Progress Indicator Bar with Accurate Live Database Values -->
            <div class="w-full p-3.5 rounded-2xl border shadow-xs flex flex-col gap-2 transition-all {theme === 'dark' ? 'bg-[#121215] border-zinc-800/80' : 'bg-white border-zinc-200/80'}">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="{theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}">Spent: <strong class="{theme === 'dark' ? 'text-white' : 'text-zinc-900'}">₱{spentBudget.toFixed(2)}</strong></span>
                <span class="{theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}">{budgetPeriod === 'weekly' ? 'Weekly Limit:' : 'Monthly Limit:'} <strong class="{theme === 'dark' ? 'text-white' : 'text-zinc-900'}">₱{totalBudget.toFixed(2)}</strong></span>
              </div>
              <div class="w-full h-2 rounded-full overflow-hidden {theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}">
                <div 
                  class="h-full rounded-full transition-all duration-700 {percentSpent > 85 ? 'bg-amber-500' : theme === 'dark' ? 'bg-emerald-400' : 'bg-[#0a4733]'}" 
                  style="width: {percentSpent}%"
                ></div>
              </div>
            </div>

            <!-- Circular Metric Gauge (Live Database Values) -->
            <div class="py-1 flex justify-center">
              <Gauge
                available={availableBudget}
                total={totalBudget}
                {theme}
                period={budgetPeriod}
                onTogglePeriod={toggleBudgetPeriod}
              />
            </div>

            <!-- Student Daily Baon Breakdown Insight -->
            <div class="w-full px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs shadow-xs transition-all {theme === 'dark' ? 'bg-[#121215] border-zinc-800/80' : 'bg-white border-zinc-200/80'}">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 {theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-[#0a4733]'}">
                  {budgetPeriod === 'weekly' ? '⚡' : '🗓️'}
                </div>
                <div>
                  <div class="font-extrabold tracking-tight {theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}">
                    Daily Baon Pace: <span class="font-mono font-black {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">₱{dailyPace.toFixed(2)}/day</span>
                  </div>
                  <p class="text-[11px] text-zinc-400">
                    {budgetPeriod === 'weekly' ? `~₱${schoolDailyPace.toFixed(2)}/day for 5-day school week` : `~₱${(availableBudget / 4).toFixed(2)}/week for 4-week month`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onclick={toggleBudgetPeriod}
                class="cursor-pointer text-[10px] font-mono font-bold px-2 py-1 rounded-lg border transition-all active:scale-95 shrink-0 {theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-emerald-400 hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-200 text-[#0a4733] hover:bg-zinc-100'}"
                title="Toggle between Weekly and Monthly"
              >
                {budgetPeriod === 'weekly' ? 'Switch to Monthly' : 'Switch to Weekly'}
              </button>
            </div>

            <!-- Quick Action Buttons: Real UI Modal instead of JS Prompt! -->
            <div class="w-full px-2 py-1 flex items-center justify-center gap-4">
              <!-- Add Expense Button -->
              <button
                onclick={() => isAddModalOpen = true}
                class="cursor-pointer flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold text-xs active:scale-95 transition-all {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
              >
                <svg class="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Expense</span>
              </button>

              <!-- Edit Budget Button (Opens Real UI Modal, NO JavaScript prompt!) -->
              <button
                onclick={openEditBudgetModal}
                class="cursor-pointer flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 shadow-xs font-bold text-xs active:scale-95 transition-all {theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'}"
              >
                <svg class="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit {budgetPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Budget</span>
              </button>
            </div>

            <!-- Safety Spend Limit Indicator (Opens Real UI Modal, NO JavaScript prompt!) -->
            <div class="w-full px-3.5 py-2.5 rounded-2xl border flex items-center justify-between shadow-xs transition-all {theme === 'dark' ? 'bg-[#121215] border-zinc-800/80 text-zinc-200' : 'bg-white border-zinc-200/80 text-zinc-800'}">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 {safetySpendLimit > 0 ? (theme === 'dark' ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800') : (theme === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400')}">
                  🛡️
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black tracking-tight">Safety Spend Guard</span>
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full {safetySpendLimit > 0 ? (theme === 'dark' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-100 text-[#0a4733]') : 'bg-zinc-200 text-zinc-600'}">
                      {safetySpendLimit > 0 ? 'PROTECTED' : 'OFF'}
                    </span>
                  </div>
                  <p class="text-[11px] font-semibold text-zinc-400 truncate">
                    {safetySpendLimit > 0 ? `Alerts if single purchase > ₱${safetySpendLimit.toFixed(2)}` : 'No spend safety limit configured'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onclick={openSafetyLimitModal}
                class="cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 shrink-0 {theme === 'dark' ? 'border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-white' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800'}"
              >
                {safetySpendLimit > 0 ? `₱${safetySpendLimit.toFixed(0)} (Edit)` : 'Set Limit'}
              </button>
            </div>

            <!-- Real Database Transactions Section -->
            <section class="w-full pt-1 flex flex-col gap-3">
              <div class="flex items-center justify-between px-1">
                <div>
                  <span class="text-[11px] font-semibold block uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                    Recent Activity
                  </span>
                  <h3 class="text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                    Transactions ({sortedTransactions.length})
                  </h3>
                </div>

                <!-- Sort & Order Toggle Button -->
                <button
                  onclick={() => sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'}
                  class="cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-xs transition-all active:scale-95 {theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}"
                  title="Toggle chronological sort order"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                </button>
              </div>

              <!-- Itemized List Fetched From Live Database -->
              <div class="flex flex-col gap-2">
                {#each sortedTransactions as item (item.id)}
                  <div class="w-full border rounded-xl px-4 py-3 shadow-2xs flex items-center justify-between hover:scale-[1.01] transition-all {theme === 'dark' ? 'bg-[#121215] border-zinc-800/80 hover:border-zinc-700' : 'bg-white border-zinc-200/80 hover:border-zinc-300'}">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 {theme === 'dark' ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-[#0a4733]'}">
                        <span class="text-base">{getItemEmoji(item)}</span>
                      </div>
                      <div class="min-w-0">
                        <div class="text-sm font-extrabold tracking-tight truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                          {cleanItemTitle(item)}
                        </div>
                        <div class="text-[11px] font-medium {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                          {formatDateTime(item.created_at)} • <span class="font-semibold">{cleanCategory(item)}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Right Column: Amount & Delete Button -->
                    <div class="flex items-center gap-2.5 shrink-0 pl-2">
                      <div class="text-base font-black tracking-tight font-mono {item.type === 'income' ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') : (theme === 'dark' ? 'text-rose-400' : 'text-rose-600')}">
                        {item.type === 'income' ? '+' : '-'}₱{Number(item.amount).toFixed(2)}
                      </div>

                      <!-- Delete Transaction with Confirmation -->
                      {#if confirmDeleteTxId === item.id}
                        <div class="flex items-center gap-1 animate-in fade-in duration-150">
                          <button
                            onclick={() => handleDeleteTransaction(item.id)}
                            disabled={isDeletingTxId === item.id}
                            class="cursor-pointer text-[10px] font-bold px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white active:scale-95 transition-all shadow-xs"
                            title="Confirm Delete"
                          >
                            {isDeletingTxId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            onclick={() => confirmDeleteTxId = null}
                            class="cursor-pointer text-[10px] font-bold px-1.5 py-1 rounded-md border {theme === 'dark' ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-zinc-300 text-zinc-600 hover:text-zinc-900'} transition-all"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      {:else}
                        <button
                          onclick={() => confirmDeleteTxId = item.id}
                          class="cursor-pointer p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all opacity-70 hover:opacity-100"
                          title="Delete Transaction"
                          aria-label="Delete Transaction"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div class="p-6 text-center border rounded-xl text-xs font-semibold {theme === 'dark' ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}">
                    No transactions recorded yet in this cycle. Tap <strong class="{theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">+</strong> to record your baon or expense!
                  </div>
                {/each}
              </div>
            </section>

          </main>

        {:else if activeTab === 'chatbot'}
          <!-- AI Financial Advisor View (Gemini 3.6 Flash Integration with live database operations) -->
          <ChatbotView
            {theme}
            userName={welcomeName || 'Student'}
            userId={session}
            availableBudget={availableBudget}
            totalIncome={totalBudget}
            totalExpense={spentBudget}
            budgetPeriod={budgetPeriod}
            selectedSession={selectedSession}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onBack={() => activeTab = 'home'}
          />

        {:else if activeTab === 'savings'}
          <SavingsView
            {theme}
            onBack={() => activeTab = 'home'}
          />

        {:else if activeTab === 'profile'}
          <ProfileView
            {theme}
            session={session}
            onToggleTheme={toggleTheme}
            onBack={() => activeTab = 'home'}
          />

        {:else if activeTab === 'settings'}
          <!-- Settings & Credits View -->
          <div class="w-full flex flex-col gap-4 pb-24 pt-2 animate-in fade-in duration-200">
            <div class="flex items-center gap-3">
              <button
                onclick={() => activeTab = 'home'}
                aria-label="Back to Home"
                class="cursor-pointer w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all {theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-emerald-950/10 text-[#0a4733] hover:bg-emerald-950/20'}"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <div>
                <span class="text-[11px] font-semibold block {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/75'}">Application Info</span>
                <h2 class="text-xl font-extrabold tracking-tight leading-none {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                  Settings & Credits
                </h2>
              </div>
            </div>

            <!-- Academic Info -->
            <div class="w-full border rounded-2xl p-4 flex flex-col gap-3 shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
                  USTP
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm font-black tracking-tight truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">CS111 Project-Based Learning</h3>
                  <p class="text-xs font-semibold {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">University of Science and Technology of Southern Philippines</p>
                </div>
              </div>

              <div class="pt-3 border-t text-xs flex flex-col gap-2 {theme === 'dark' ? 'border-zinc-800/80 text-zinc-300' : 'border-zinc-200 text-zinc-600'}">
                <div class="flex justify-between items-center">
                  <span class="font-bold">Institution:</span>
                  <span class="font-medium text-right">USTP CDO Campus</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="font-bold">Course & Subject:</span>
                  <span class="font-medium">BS Computer Science • CS111</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="font-bold">Milestone:</span>
                  <span class="font-medium">Prelims PBL</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="font-bold">App Version:</span>
                  <span class="font-mono font-medium">{APP_VERSION}</span>
                </div>
              </div>
            </div>

            <!-- Project Team Credits -->
            <div class="w-full border rounded-2xl p-4 flex flex-col gap-3 shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
              <div class="flex items-center justify-between border-b pb-2.5 {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}">
                <div class="flex items-center gap-2">
                  <span class="text-base">👥</span>
                  <h3 class="text-sm font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                    Project Team & Contributors
                  </h3>
                </div>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full {theme === 'dark' ? 'bg-emerald-950 border border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 text-[#0a4733]'}">
                  5 Members
                </span>
              </div>

              <div class="flex flex-col gap-2">
                {#each [
                  { role: 'Problem & Design Analyst', name: 'Shawn Hitalada', handle: '@Shawn Hitalada', icon: '🎨' },
                  { role: 'Main Programmer', name: 'Justine Salvador', handle: '@Justine Salvador', icon: '💻' },
                  { role: 'Tester & Debugger', name: 'John Kurt Montero', handle: '@John Kurt Montero', icon: '🧪' },
                  { role: 'Operator & Presenter', name: 'Mark Bacus', handle: '@Mark Bacus', icon: '🎙️' },
                  { role: 'Project Leader', name: 'Danlord Farell A. Soriano', handle: '@Danlord Farell A. Soriano', icon: '👑' }
                ] as member}
                  <div class="p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors {theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200/80 hover:border-zinc-300'}">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="text-base shrink-0">{member.icon}</span>
                      <div class="min-w-0">
                        <span class="text-[10px] font-bold uppercase tracking-wider block {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">
                          {member.role}
                        </span>
                        <h4 class="text-xs font-black truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                          {member.name}
                        </h4>
                      </div>
                    </div>
                    <span class="text-[11px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-lg border {theme === 'dark' ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}">
                      {member.handle}
                    </span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Visual Theme -->
            <div class="w-full border rounded-2xl p-4 flex items-center justify-between transition-colors shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center {theme === 'dark' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-100 text-zinc-700'}">
                  {#if theme === 'dark'}
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2m-7.07-15.07 1.41 1.41m12.72 12.72 1.41 1.41M2 12h2m16 0h2m-13.66 5.66-1.41 1.41m12.73-12.73-1.41 1.41" />
                    </svg>
                  {:else}
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  {/if}
                </div>
                <div>
                  <h4 class="text-sm font-extrabold tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Visual Appearance</h4>
                  <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                    Active Mode: <strong class="capitalize {theme === 'dark' ? 'text-amber-300' : 'text-[#0a4733]'}">{theme} Mode</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onclick={toggleTheme}
                class="cursor-pointer px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 {theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-amber-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'}"
              >
                <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            </div>

            <!-- Allowance Cycle Specification (Weekly or Monthly) -->
            <div class="w-full border rounded-2xl p-4 flex flex-col gap-3 transition-colors shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg {theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-[#0a4733]'}">
                  📆
                </div>
                <div>
                  <h4 class="text-sm font-extrabold tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Allowance Cycle Period</h4>
                  <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                    Active specification: <strong class="capitalize {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">{budgetPeriod} Allowance</strong>
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onclick={() => setBudgetPeriod('weekly')}
                  class="cursor-pointer p-3 rounded-xl border text-left transition-all active:scale-98 {budgetPeriod === 'weekly' ? (theme === 'dark' ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-xs' : 'border-[#0a4733] bg-emerald-50 text-[#0a4733] shadow-xs') : (theme === 'dark' ? 'border-zinc-800 hover:border-zinc-700 text-zinc-400' : 'border-zinc-200 hover:border-zinc-300 text-zinc-600')}"
                >
                  <div class="font-black text-xs flex items-center justify-between">
                    <span class="flex items-center gap-1.5">
                      <AppIcon name="weekly" size={14} />
                      Weekly Cycle
                    </span>
                    {#if budgetPeriod === 'weekly'}<span class="text-emerald-500 font-bold">✓ Active</span>{/if}
                  </div>
                  <p class="text-[10px] mt-1 opacity-80 leading-snug">Ideal for weekly school baon (5 or 7 day basis).</p>
                </button>

                <button
                  type="button"
                  onclick={() => setBudgetPeriod('monthly')}
                  class="cursor-pointer p-3 rounded-xl border text-left transition-all active:scale-98 {budgetPeriod === 'monthly' ? (theme === 'dark' ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-xs' : 'border-[#0a4733] bg-emerald-50 text-[#0a4733] shadow-xs') : (theme === 'dark' ? 'border-zinc-800 hover:border-zinc-700 text-zinc-400' : 'border-zinc-200 hover:border-zinc-300 text-zinc-600')}"
                >
                  <div class="font-black text-xs flex items-center justify-between">
                    <span class="flex items-center gap-1.5">
                      <AppIcon name="monthly" size={14} />
                      Monthly Cycle
                    </span>
                    {#if budgetPeriod === 'monthly'}<span class="text-emerald-500 font-bold">✓ Active</span>{/if}
                  </div>
                  <p class="text-[10px] mt-1 opacity-80 leading-snug">Ideal for monthly allowance, dorm rent, or cutoffs.</p>
                </button>
              </div>
            </div>

            <!-- Account Management -->
            <div class="w-full border rounded-2xl p-4 flex flex-col gap-3 transition-colors {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-extrabold tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Active Account</h4>
                  <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Logged in as {welcomeName || 'Student'}</p>
                </div>
                <button
                  onclick={handleLogout}
                  class="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 border border-rose-500/30 hover:bg-rose-500/10 active:scale-95 transition-all"
                >
                  Log Out
                </button>
              </div>
            </div>

            <!-- PWA Installer -->
            <div class="w-full border rounded-2xl p-4 flex flex-col gap-3 transition-colors {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-extrabold tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Install Ctrl+Savings</h4>
                  <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Add to Home Screen for offline access</p>
                </div>
                <div class="w-8 h-8 rounded-full flex items-center justify-center {theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-[#0a4733]'}">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
              </div>

              {#if isInstalled}
                <div class="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center border {theme === 'dark' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}">
                  ✓ App Installed on Device
                </div>
              {:else}
                <button
                  onclick={handleInstallPWA}
                  class="cursor-pointer w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
                >
                  <span>Download & Install App</span>
                </button>
              {/if}
            </div>
          </div>
        {/if}

      </div>

      <!-- Bottom Navigation Bar -->
      <BottomNav
        {activeTab}
        {theme}
        onTabChange={(tab) => activeTab = tab}
        onAddClick={() => isAddModalOpen = true}
      />

      <!-- Quick Add Transaction Modal -->
      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => isAddModalOpen = false}
        onAdd={handleAddTransaction}
        {theme}
        currentBalance={availableBudget}
        safetyLimit={safetySpendLimit}
        onUpdateSafetyLimit={updateSafetyLimit}
      />

      <!-- Allowance Cycles Management Modal -->
      <SessionModal
        isOpen={isSessionModalOpen}
        {theme}
        {sessions}
        {activeSessionId}
        {selectedSessionId}
        {transactions}
        apiError={apiErrorMessage}
        onClearError={() => apiErrorMessage = ''}
        onClose={() => isSessionModalOpen = false}
        onStartNewSession={handleStartNewSession}
        onSelectSession={(id) => selectedSessionId = id}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
      />

      <!-- REAL UI MODAL: Edit Budget Modal (Replaces browser prompt) -->
      {#if isEditBudgetModalOpen}
        <div
          transition:fade={{ duration: 180 }}
          class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-budget-title"
        >
          <div
            transition:scale={{ start: 0.95, duration: 200 }}
            class="w-full max-w-sm rounded-2xl border shadow-2xl p-5 flex flex-col gap-4 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-[#0a4733]'}"
          >
            <!-- Header -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Budget Configuration</span>
                <h3 id="edit-budget-title" class="text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                  Edit {budgetPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Budget
                </h3>
              </div>
              <button
                onclick={() => isEditBudgetModalOpen = false}
                class="cursor-pointer w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <!-- Action Mode Selector -->
            <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl border {theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}">
              <button
                type="button"
                onclick={() => editBudgetAction = 'goal'}
                class="cursor-pointer py-1.5 text-xs font-bold rounded-lg transition-all {editBudgetAction === 'goal' ? (theme === 'dark' ? 'bg-emerald-500 text-black shadow-xs' : 'bg-[#0a4733] text-white shadow-xs') : (theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')}"
              >
                Target Limit
              </button>
              <button
                type="button"
                onclick={() => editBudgetAction = 'income'}
                class="cursor-pointer py-1.5 text-xs font-bold rounded-lg transition-all {editBudgetAction === 'income' ? (theme === 'dark' ? 'bg-emerald-500 text-black shadow-xs' : 'bg-[#0a4733] text-white shadow-xs') : (theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')}"
              >
                + Add Allowance
              </button>
            </div>

            <p class="text-xs text-zinc-400 leading-snug">
              {#if editBudgetAction === 'goal'}
                Updates the cycle's target baon limit in the database.
              {:else}
                Records a new allowance income to immediately increase available baon cash.
              {/if}
            </p>

            <!-- Amount Input -->
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-zinc-400">₱</span>
              <input
                type="number"
                step="any"
                min="1"
                bind:value={editBudgetAmount}
                placeholder="500.00"
                class="w-full pl-9 pr-4 py-3 rounded-xl font-mono font-bold text-lg border outline-none transition-all focus:ring-2 {theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
              />
            </div>

            <!-- Quick Preset Chips -->
            <div class="flex items-center gap-1.5 flex-wrap">
              {#each [200, 300, 500, 1000, 2000] as preset}
                <button
                  type="button"
                  onclick={() => editBudgetAmount = preset.toString()}
                  class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all active:scale-95 {editBudgetAmount === preset.toString() ? (theme === 'dark' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-[#0a4733] text-[#0a4733]') : (theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50')}"
                >
                  ₱{preset}
                </button>
              {/each}
            </div>

            <!-- Modal Action Buttons (Terse 1-word copywriting) -->
            <div class="flex items-center gap-2 pt-2 border-t {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}">
              <button
                type="button"
                onclick={() => isEditBudgetModalOpen = false}
                class="cursor-pointer flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-colors {theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'}"
              >
                Cancel
              </button>
              <button
                type="button"
                onclick={handleSaveEditBudget}
                disabled={isSubmittingBudget}
                class="cursor-pointer flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center active:scale-95 transition-all shadow-md {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
              >
                {isSubmittingBudget ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- REAL UI MODAL: Safety Limit Modal (Replaces browser prompt) -->
      {#if isSafetyLimitModalOpen}
        <div
          transition:fade={{ duration: 180 }}
          class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="safety-limit-title"
        >
          <div
            transition:scale={{ start: 0.95, duration: 200 }}
            class="w-full max-w-sm rounded-2xl border shadow-2xl p-5 flex flex-col gap-4 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-[#0a4733]'}"
          >
            <!-- Header -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Guard Configuration</span>
                <h3 id="safety-limit-title" class="text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                  Safety Spend Limit
                </h3>
              </div>
              <button
                onclick={() => isSafetyLimitModalOpen = false}
                class="cursor-pointer w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p class="text-xs text-zinc-400 leading-snug">
              Warns and requests confirmation whenever any single transaction exceeds this threshold (Set 0 to turn off).
            </p>

            <!-- Amount Input -->
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-zinc-400">₱</span>
              <input
                type="number"
                step="any"
                min="0"
                bind:value={safetyLimitInput}
                placeholder="150.00"
                class="w-full pl-9 pr-4 py-3 rounded-xl font-mono font-bold text-lg border outline-none transition-all focus:ring-2 {theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
              />
            </div>

            <!-- Quick Preset Chips -->
            <div class="flex items-center gap-1.5 flex-wrap">
              {#each [0, 50, 100, 150, 300, 500] as preset}
                <button
                  type="button"
                  onclick={() => safetyLimitInput = preset.toString()}
                  class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all active:scale-95 {safetyLimitInput === preset.toString() ? (theme === 'dark' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-[#0a4733] text-[#0a4733]') : (theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50')}"
                >
                  {preset === 0 ? 'Off (₱0)' : `₱${preset}`}
                </button>
              {/each}
            </div>

            <!-- Modal Action Buttons -->
            <div class="flex items-center gap-2 pt-2 border-t {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}">
              <button
                type="button"
                onclick={() => isSafetyLimitModalOpen = false}
                class="cursor-pointer flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-colors {theme === 'dark' ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'}"
              >
                Cancel
              </button>
              <button
                type="button"
                onclick={handleSaveSafetyLimit}
                class="cursor-pointer flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center active:scale-95 transition-all shadow-md {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Floating PWA Prompt -->
      {#if showInstallBubble}
        <aside
          transition:fly={{ y: 24, duration: 350, easing: cubicOut }}
          class="pointer-events-auto absolute bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-40 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md flex flex-col gap-2.5 {theme === 'dark' ? 'bg-[#121215]/95 border-emerald-900/60 text-white shadow-black/40' : 'bg-white/95 border-emerald-200/90 text-zinc-900 shadow-emerald-900/10'}"
          aria-label="Install App Prompt"
        >
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 {theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-emerald-50 border border-emerald-100'}">
              <img src="/Logo.png" alt="Logo" class="w-full h-full object-contain" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h5 class="text-xs font-black tracking-tight leading-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Install Ctrl+Savings</h5>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded {theme === 'dark' ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 text-[#0a4733]'}">PWA</span>
              </div>
              <p class="text-[11px] leading-snug mt-0.5 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}">Install on your home screen for zero-lag access.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-1 border-t {theme === 'dark' ? 'border-zinc-800/80' : 'border-emerald-100'}">
            <button
              onclick={() => isDismissed = true}
              class="cursor-pointer flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors text-center {theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}"
            >
              Dismiss
            </button>
            <button
              onclick={handleInstallPWA}
              class="cursor-pointer flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center justify-center gap-1.5 {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
            >
              <span>Install</span>
            </button>
          </div>
        </aside>
      {/if}

    {/if}

  </div>
</div>
