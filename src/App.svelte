<script>
  import { fade, fly } from 'svelte/transition'
  import { cubicOut, expoInOut } from 'svelte/easing'
  import TopBar from './lib/components/TopBar.svelte'
  import Gauge from './lib/components/Gauge.svelte'
  import SpendingChart from './lib/components/SpendingChart.svelte'
  import BottomNav from './lib/components/BottomNav.svelte'
  import SavingsView from './lib/components/SavingsView.svelte'
  import ChatbotView from './lib/components/ChatbotView.svelte'
  import ProfileView from './lib/components/ProfileView.svelte'
  import AddModal from './lib/components/AddModal.svelte'
  import SessionModal from './lib/components/SessionModal.svelte'
  import AuthView from './lib/components/AuthView.svelte'

  // Application State
  const APP_VERSION = 'v1.1.0'
  let appLoaded = $state(false)
  let activeTab = $state('home') // 'home', 'chatbot', 'profile', 'settings'
  let theme = $state('light') // Default to clean light theme matching the reference design
  let isAddModalOpen = $state(false)
  let deferredPrompt = $state(null)
  let isInstalled = $state(false)
  let isDismissed = $state(false)
  let session = $state(null)
  
  // Welcome Screen State
  let showWelcome = $state(false)
  let welcomeName = $state('')

  // Floating bubble shows if not in standalone/installed mode and user hasn't hit dismiss in this session
  let showInstallBubble = $derived(!isInstalled && !isDismissed && appLoaded && session)

  // Trigger splash screen hero animation after loading and check custom API session
  $effect(() => {
    // Check if running as installed standalone PWA app
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true ||
                           document.referrer.includes('android-app://')
      if (isStandalone) {
        isInstalled = true
      }

      // In local dev/preview on localhost, clear stale service workers so code updates immediately
      if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister())
        })
      }
    }

    // Check our custom local API session
    const userId = localStorage.getItem('allowance_user_id')
    if (userId && userId !== 'undefined' && userId !== 'null') {
      session = userId
    } else {
      session = null
      if (userId) localStorage.removeItem('allowance_user_id')
    }

    const savedTheme = localStorage.getItem('allowance_theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme = savedTheme
    }

    const timer = setTimeout(() => {
      appLoaded = true
    }, 1800)
    
    return () => clearTimeout(timer)
  })

  // Listen for PWA installation prompt event
  $effect(() => {
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  })

  async function handleInstallPWA() {
    if (!deferredPrompt) {
      alert('To install this app on your device:\n\n• On iOS (Safari): Tap the Share button (square with arrow up), then select "Add to Home Screen".\n• On Android/Chrome: Tap the 3 dots menu and select "Install app" or "Add to Home screen".\n• On Desktop: Click the install icon in your address bar.')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      isInstalled = true
    }
    deferredPrompt = null
  }

  // Budget & Transactions State
  let transactions = $state([])
  let apiErrorMessage = $state('')

  // Allowance Cycles / Sessions State
  let isSessionModalOpen = $state(false)
  let sessions = $state([])
  let activeSessionId = $state('')
  let selectedSessionId = $state('')

  async function fetchSessions() {
    if (!session) return
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok && Array.isArray(result.data) && result.data.length > 0) {
        const mapped = result.data.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          goalAmount: Number(s.goal_amount) || 0,
          goalTitle: s.goal_title || '',
          isActive: s.is_active,
          createdAt: s.created_at,
          closedAt: s.closed_at
        }))
        sessions = mapped
        const active = mapped.find(s => s.isActive || !s.closedAt) || mapped[0]
        activeSessionId = active.id
        if (!selectedSessionId || !mapped.some(s => s.id === selectedSessionId)) {
          selectedSessionId = active.id
        }
        localStorage.setItem('allowance_sessions_' + session, JSON.stringify(mapped))
        return
      } else if (!res.ok) {
        apiErrorMessage = `Load Cycles Failed (${res.status}): ${result.error || res.statusText || 'Unable to load cycles'}`
      }
    } catch (e) {
      apiErrorMessage = `Network error loading cycles: ${e.message}`
    }

    // Fallback to local storage (and migrate legacy non-UUID IDs)
    const stored = localStorage.getItem('allowance_sessions_' + session)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          const sanitized = parsed.map(s => {
            if (!s.id || !UUID_REGEX.test(s.id)) {
              return { ...s, id: crypto.randomUUID() }
            }
            return s
          })
          sessions = sanitized
          const active = sanitized.find(s => s.isActive || !s.closedAt) || sanitized[0]
          activeSessionId = active.id
          if (!selectedSessionId || !sanitized.some(s => s.id === selectedSessionId)) {
            selectedSessionId = active.id
          }
          localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sanitized))
          return
        }
      } catch (e) {}
    }

    // Default session if none exists
    const defaultSess = {
      id: crypto.randomUUID(),
      name: 'Initial Allowance Cycle',
      description: 'First tracked period',
      goalAmount: 0,
      goalTitle: '',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      closedAt: null
    }
    sessions = [defaultSess]
    activeSessionId = defaultSess.id
    selectedSessionId = defaultSess.id
    localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
  }

  async function handleStartNewSession({ name, description, goalAmount = 0, goalTitle = '' }) {
    const nowIso = new Date().toISOString()
    const tempId = crypto.randomUUID()
    let newSession = {
      id: tempId,
      name,
      description: description || '',
      goalAmount: Number(goalAmount) || 0,
      goalTitle: goalTitle || '',
      isActive: true,
      createdAt: nowIso,
      closedAt: null
    }

    const previousSessions = [...sessions]
    const previousActive = activeSessionId
    const previousSelected = selectedSessionId

    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, closedAt: nowIso, isActive: false }
      }
      return s
    })

    sessions = [newSession, ...updated]
    activeSessionId = newSession.id
    selectedSessionId = newSession.id
    localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))

    // Persist to Supabase Database
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session
        },
        body: JSON.stringify({
          name,
          description,
          goal_amount: goalAmount,
          goal_title: goalTitle
        })
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok && result.data) {
        newSession.id = result.data.id
        newSession.createdAt = result.data.created_at
        sessions = [newSession, ...updated]
        activeSessionId = newSession.id
        selectedSessionId = newSession.id
        localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
        apiErrorMessage = ''
        return { success: true, data: result.data }
      } else {
        apiErrorMessage = `Create Cycle Failed (${res.status}): ${result.error || res.statusText || 'Unable to create cycle'}`
        sessions = previousSessions
        activeSessionId = previousActive
        selectedSessionId = previousSelected
        localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
        return { success: false, error: apiErrorMessage }
      }
    } catch (e) {
      apiErrorMessage = `Create Cycle Network Error: ${e.message}`
      sessions = previousSessions
      activeSessionId = previousActive
      selectedSessionId = previousSelected
      localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
      return { success: false, error: apiErrorMessage }
    }
  }

  async function handleEditSession(sessionId, { name, description, goalAmount = 0, goalTitle = '' }) {
    const previousSessions = [...sessions]
    sessions = sessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          name,
          description: description || '',
          goalAmount: Number(goalAmount) || 0,
          goalTitle: goalTitle || ''
        }
      }
      return s
    })
    localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))

    try {
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session
        },
        body: JSON.stringify({
          id: sessionId,
          name,
          description,
          goal_amount: goalAmount,
          goal_title: goalTitle
        })
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok) {
        apiErrorMessage = ''
        return { success: true }
      } else {
        apiErrorMessage = `Edit Cycle Failed (${res.status}): ${result.error || res.statusText}`
        sessions = previousSessions
        localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
        return { success: false, error: apiErrorMessage }
      }
    } catch (e) {
      apiErrorMessage = `Edit Cycle Network Error: ${e.message}`
      sessions = previousSessions
      localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
      return { success: false, error: apiErrorMessage }
    }
  }

  async function handleDeleteSession(sessionId) {
    const previousSessions = [...sessions]
    const previousActive = activeSessionId
    const previousSelected = selectedSessionId

    sessions = sessions.filter(s => s.id !== sessionId)
    if (sessions.length === 0) {
      const fallback = {
        id: crypto.randomUUID(),
        name: 'Allowance Cycle',
        description: '',
        goalAmount: 0,
        goalTitle: '',
        isActive: true,
        createdAt: new Date(0).toISOString(),
        closedAt: null
      }
      sessions = [fallback]
    }
    if (activeSessionId === sessionId) {
      activeSessionId = sessions[0].id
    }
    if (selectedSessionId === sessionId) {
      selectedSessionId = activeSessionId
    }
    localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))

    try {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session }
      })
      const result = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      if (res.ok) {
        apiErrorMessage = ''
        return { success: true }
      } else {
        apiErrorMessage = `Delete Cycle Failed (${res.status}): ${result.error || res.statusText}`
        sessions = previousSessions
        activeSessionId = previousActive
        selectedSessionId = previousSelected
        localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
        return { success: false, error: apiErrorMessage }
      }
    } catch (e) {
      apiErrorMessage = `Delete Cycle Network Error: ${e.message}`
      sessions = previousSessions
      activeSessionId = previousActive
      selectedSessionId = previousSelected
      localStorage.setItem('allowance_sessions_' + session, JSON.stringify(sessions))
      return { success: false, error: apiErrorMessage }
    }
  }

  let selectedSession = $derived(sessions.find(s => s.id === selectedSessionId) || sessions[0])

  let sessionTransactions = $derived.by(() => {
    if (!selectedSession) return transactions
    const start = new Date(selectedSession.createdAt).getTime()
    const end = selectedSession.closedAt ? new Date(selectedSession.closedAt).getTime() : Infinity
    return transactions.filter(t => {
      const tTime = new Date(t.created_at).getTime()
      return tTime >= start && tTime <= end
    })
  })

  let totalIncome = $derived(sessionTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0))
  let totalExpense = $derived(sessionTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0))
  let availableBudget = $derived(totalIncome - totalExpense)
  let totalBudget = $derived(totalIncome)

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

  $effect(() => {
    if (session) {
      fetchTransactions()
      fetchUserProfile()
      fetchSessions()
    }
  })

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
          transactions = [result.data, ...transactions]
        }
        selectedSessionId = activeSessionId
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

  let confirmDeleteTxId = $state(null)
  let isDeletingTxId = $state(null)

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
      if (res.ok) {
        apiErrorMessage = ''
      } else {
        transactions = previousTransactions
        apiErrorMessage = `Delete Transaction Failed (${res.status}): ${result.error || res.statusText || 'Could not delete transaction'}`
      }
    } catch (e) {
      transactions = previousTransactions
      apiErrorMessage = `Delete Transaction Network Error: ${e.message}`
    } finally {
      isDeletingTxId = null
    }
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('allowance_theme', theme)
  }

  function formatDateTime(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${dateStr} • ${timeStr}`
  }

  function getTimeAgo(isoString) {
    if (!isoString) return ''
    const now = new Date()
    const past = new Date(isoString)
    const diffMs = now.getTime() - past.getTime()
    const diffSec = Math.max(0, Math.floor(diffMs / 1000))

    if (diffSec < 45) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 30) return `${diffDays} days ago`
    const diffMonths = Math.floor(diffDays / 30)
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
    const diffYears = Math.floor(diffDays / 365)
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`
  }

  function getTransactionEmoji(t) {
    if (!t) return '📄'
    const text = ((t.category || '') + ' ' + (t.description || '')).toLowerCase()
    if (text.includes('🍔') || text.includes('food') || text.includes('lunch') || text.includes('snack') || text.includes('dinner')) return '🍔'
    if (text.includes('☕') || text.includes('coffee') || text.includes('tea') || text.includes('drink')) return '☕'
    if (text.includes('🚌') || text.includes('transport') || text.includes('jeep') || text.includes('fare')) return '🚌'
    if (text.includes('📚') || text.includes('school') || text.includes('tuition') || text.includes('book')) return '📚'
    if (text.includes('💡') || text.includes('bill') || text.includes('electric') || text.includes('water')) return '💡'
    if (text.includes('📶') || text.includes('wifi') || text.includes('load') || text.includes('internet')) return '📶'
    if (text.includes('🛒') || text.includes('grocer')) return '🛒'
    if (text.includes('💰') || text.includes('allowance') || text.includes('baon')) return '💰'
    if (text.includes('🎁') || text.includes('gift')) return '🎁'
    if (text.includes('💼') || text.includes('salary') || text.includes('work')) return '💼'
    if (text.includes('🏦') || text.includes('saving')) return '🏦'
    if (text.includes('🚀') || text.includes('hustle')) return '🚀'
    if (text.includes('🍕')) return '🍕'
    if (text.includes('🎮') || text.includes('game')) return '🎮'
    if (text.includes('💊') || text.includes('med')) return '💊'
    if (text.includes('🛍️') || text.includes('shop')) return '🛍️'
    if (text.includes('⛽') || text.includes('gas') || text.includes('fuel')) return '⛽'
    return t.type === 'income' ? '💰' : '💳'
  }
</script>

<!-- Main Application Container (Fully responsive, Locked to Viewport Height) -->
<div class="h-[100dvh] w-full overflow-hidden flex justify-center {theme === 'dark' ? 'bg-[#09090b] text-white' : 'bg-[#f7f9f7] text-[#0a4733]'} relative">

  <!-- Background fade out for splash screen -->
  {#if !appLoaded}
    <div
      out:fade={{ duration: 1000, easing: expoInOut }}
      class="absolute inset-0 z-[100] {theme === 'dark' ? 'bg-[#09090b]' : 'bg-[#f7f9f7]'}"
    ></div>
  {/if}

  <!-- Zero-Gatekeeping Floating Error Notification (Visible across all screens, modals & tabs) -->
  {#if apiErrorMessage}
    <div
      role="alert"
      class="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] p-4 rounded-2xl border-2 bg-red-600 text-white shadow-2xl flex flex-col gap-2.5 animate-in slide-in-from-top-4 duration-200"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-white text-red-600 font-black text-xs flex items-center justify-center shrink-0">
            !
          </div>
          <span class="text-xs font-black uppercase tracking-wider text-white">Database / API Error</span>
        </div>
        <button
          type="button"
          aria-label="Dismiss error"
          onclick={() => apiErrorMessage = ''}
          class="cursor-pointer p-1 rounded-md text-white/80 hover:text-white hover:bg-white/20 font-black text-sm"
        >
          ✕
        </button>
      </div>
      <p class="text-xs font-mono break-all leading-relaxed bg-black/25 p-2.5 rounded-xl border border-white/20 select-text">
        {apiErrorMessage}
      </p>
      <div class="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          onclick={() => { apiErrorMessage = ''; fetchTransactions(); fetchUserProfile(); fetchSessions(); }}
          class="cursor-pointer text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-red-700 shadow-xs transition-colors"
        >
          Retry Sync
        </button>
      </div>
    </div>
  {/if}

  <!-- Responsive Viewport Frame -->
  <div class="relative w-full max-w-2xl h-full flex flex-col justify-between">
    
    <!-- Hero Animated Logo (Seamlessly flies from center to top-left if logged in, stays if logging in) -->
    <div 
      class="absolute z-[110] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center {appLoaded && session ? 'top-4 left-6 w-10 h-10 translate-x-0 translate-y-0' : 'top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-0 pointer-events-none'}"
    >
      <img src="/Logo.png" alt="Ctrl+Savings Logo" class="w-full h-full object-contain" />
    </div>

    {#if appLoaded && !session}
      <AuthView {theme} onSuccess={(name) => {
        welcomeName = name
        showWelcome = true
        session = localStorage.getItem('allowance_user_id')
        setTimeout(() => {
          showWelcome = false
        }, 2000)
      }} />
    {:else if showWelcome}
      <div class="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 z-50 p-6 text-center gap-4">
        <div class="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline stroke-linecap="round" stroke-linejoin="round" points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 class="text-4xl font-black {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Welcome,</h2>
        <h3 class="text-3xl font-bold {theme === 'dark' ? 'text-emerald-400' : 'text-[#22c55e]'}">{welcomeName}!</h3>
      </div>
    {:else if session}
      
      <!-- Top Mobile App Bar (With proper theme contrast) -->
      <TopBar
        {theme}
        activeSessionName={selectedSession ? selectedSession.name : 'Allowance Cycle'}
        onOpenSessions={() => isSessionModalOpen = true}
      />

      <!-- Scrollable Main Content (Switches to flex container for Chatbot to dock input bar) -->
      <div class="flex-1 {activeTab === 'chatbot' ? 'overflow-hidden flex flex-col pb-20' : 'overflow-y-auto pb-36'} overflow-x-hidden min-w-0">

      {#if apiErrorMessage}
        <div class="mx-6 my-2 p-3.5 rounded-xl border bg-red-500/10 border-red-500/40 text-red-500 text-xs font-semibold flex flex-col gap-2 shadow-xs animate-in fade-in duration-150">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span class="font-black uppercase tracking-wider text-[10px]">Error Alert</span>
            </div>
            <button 
              onclick={() => { apiErrorMessage = ''; fetchTransactions(); fetchUserProfile(); }} 
              class="underline font-bold hover:opacity-80 shrink-0 cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
          <span class="font-mono text-xs break-all bg-black/5 dark:bg-black/30 p-2 rounded-lg select-text">{apiErrorMessage}</span>
        </div>
      {/if}

      {#if selectedSessionId !== activeSessionId}
        <div class="mx-6 my-2 p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm">📂</span>
            <span class="truncate font-bold">Viewing Past Cycle: "{selectedSession?.name}"</span>
          </div>
          <button
            onclick={() => selectedSessionId = activeSessionId}
            class="underline font-black cursor-pointer shrink-0 hover:opacity-80"
          >
            Back to Active Cycle
          </button>
        </div>
      {/if}

      {#if activeTab === 'home'}
        <!-- Screen 1 & 2: Budget Overview & Dashboard -->
        <main class="w-full flex flex-col gap-1 min-w-0 animate-in fade-in duration-150">

          <!-- Category Header: High-contrast white on dark, deep green on light (NO artificial DARK box!) -->
          <div class="px-6 pt-1 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-semibold tracking-tight block {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/70'}">
                Current Wallet
              </span>
              <h2 class="text-2xl font-black tracking-tight leading-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                Available Cash
              </h2>
            </div>
          </div>

          <!-- Hero Circular Gauge with High-Contrast dynamic track & arc -->
          <Gauge
            available={availableBudget}
            total={totalBudget}
            unit="₱"
            {theme}
          />

          <!-- Quick Action Buttons under Gauge (Screen 1) -->
          <div class="w-full px-12 py-2 flex items-center justify-between">
            <!-- Add Transaction Button -->
            <button
              onclick={() => isAddModalOpen = true}
              class="cursor-pointer flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors {theme === 'dark' ? 'bg-emerald-500 text-black group-hover:bg-emerald-400' : 'bg-[#0a4733] text-white group-hover:bg-[#0d5940]'}">
                <svg class="w-5 h-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span class="text-xs font-bold tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                Add Trans.
              </span>
            </button>

            <!-- Edit Budget Button (Placeholder or disabled since we removed budget limit) -->
            <button
              class="cursor-pointer flex flex-col items-center gap-1.5 group active:scale-95 transition-transform opacity-50"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
                <svg class="w-5 h-5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <span class="text-xs font-bold tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                Reports
              </span>
            </button>
          </div>

          <!-- Cycle Savings Goal Banner (Gamified & Addictive Progress) -->
          {#if selectedSession?.goalAmount > 0}
            {@const goalTarget = Number(selectedSession.goalAmount)}
            {@const currentSaved = availableBudget}
            {@const percentReached = Math.min(100, Math.max(0, Math.round((currentSaved / goalTarget) * 100)))}
            {@const isGoalComplete = currentSaved >= goalTarget}

            <div class="w-full px-6 py-1">
              <button
                type="button"
                onclick={() => isSessionModalOpen = true}
                class="w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-98 shadow-xs {theme === 'dark' ? 'bg-[#18181b] border-zinc-800 hover:border-emerald-500/50' : 'bg-white border-zinc-200 hover:border-emerald-300'}"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-base">{isGoalComplete ? '🎉' : '🎯'}</span>
                    <div class="min-w-0">
                      <h4 class="text-xs font-black tracking-tight truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                        {selectedSession.goalTitle || 'Cycle Savings Goal'}
                      </h4>
                      <span class="text-[10px] font-bold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                        Target: ₱{goalTarget.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full {isGoalComplete ? (theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white') : (theme === 'dark' ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-100 text-[#0a4733]')}">
                      {isGoalComplete ? 'Goal Smashed!' : `${percentReached}%`}
                    </span>
                  </div>
                </div>

                <!-- Animated Progress Bar -->
                <div class="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
                  <div
                    class="h-full rounded-full transition-all duration-500 {isGoalComplete ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-sm' : (theme === 'dark' ? 'bg-emerald-400' : 'bg-[#0a4733]')}"
                    style="width: {percentReached}%"
                  ></div>
                </div>

                <div class="flex items-center justify-between text-[10px] font-extrabold mt-2 pt-1 border-t {theme === 'dark' ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-100 text-zinc-500'}">
                  <span>Saved Up: <strong class="{currentSaved >= 0 ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : 'text-red-500'}">₱{currentSaved.toFixed(2)}</strong></span>
                  <span>
                    {#if isGoalComplete}
                      +₱{(currentSaved - goalTarget).toFixed(2)} surplus!
                    {:else}
                      ₱{(goalTarget - currentSaved).toFixed(2)} left to reach goal
                    {/if}
                  </span>
                </div>
              </button>
            </div>
          {/if}

          <!-- Transactions Section (Screen 1) -->
          <section class="w-full px-6 pt-2 pb-6 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-semibold block {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                  Recent Activity
                </span>
                <h3 class="text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                  Transactions
                </h3>
              </div>
            </div>

            <!-- Transaction List -->
            <div class="flex flex-col gap-2">
              {#if sessionTransactions.length === 0}
                <div class="text-center text-sm py-6 opacity-60">No transactions in this cycle yet. Add money to get started!</div>
              {/if}
              {#each sessionTransactions as t (t.id)}
                <div class="w-full border rounded-xl p-3 flex items-center justify-between shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center {theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}">
                      <span class="text-lg leading-none">
                        {getTransactionEmoji(t)}
                      </span>
                    </div>
                    <div>
                      <h4 class="text-sm font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">{t.description || t.category}</h4>
                      <p class="text-[10px] font-semibold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} flex items-center gap-1.5 flex-wrap">
                        <span class="font-black {t.type === 'income' ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : (theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}">
                          {getTimeAgo(t.created_at)}
                        </span>
                        <span>•</span>
                        <span>{formatDateTime(t.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if isDeletingTxId === t.id}
                      <div class="flex items-center gap-1.5 animate-pulse">
                        <span class="text-[10px] font-black text-red-500">Deleting...</span>
                      </div>
                    {:else if confirmDeleteTxId === t.id}
                      <div class="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <span class="text-[10px] font-bold text-red-500">Delete?</span>
                        <button
                          type="button"
                          onclick={() => handleDeleteTransaction(t.id)}
                          class="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onclick={() => confirmDeleteTxId = null}
                          class="text-[10px] font-bold px-1.5 py-0.5 rounded border {theme === 'dark' ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-zinc-300 text-zinc-600 hover:text-black'} cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    {:else}
                      <div class="text-right">
                        <span class="text-sm font-black tracking-tight {t.type === 'income' ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : (theme === 'dark' ? 'text-white' : 'text-zinc-900')}">
                          {t.type === 'income' ? '+' : '-'}₱{Number(t.amount).toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Delete transaction"
                        title="Delete Transaction"
                        onclick={() => confirmDeleteTxId = t.id}
                        class="cursor-pointer p-1.5 rounded-lg opacity-40 hover:opacity-100 text-red-500 hover:bg-red-500/10 active:scale-90 transition-all shrink-0"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>

        </main>

      {:else if activeTab === 'chatbot' || activeTab === 'savings'}
        <!-- AI Financial Assistant Chatbot -->
        <ChatbotView
          {theme}
          userName={welcomeName || 'Student'}
          userId={session}
          {availableBudget}
          {totalIncome}
          {totalExpense}
          {selectedSession}
          {transactions}
          onAddTransaction={handleAddTransaction}
          onBack={() => activeTab = 'home'}
        />

      {:else if activeTab === 'profile'}
        <!-- Profile / Preferences Screen (Contains the clean theme toggle) -->
        <ProfileView
          {theme}
          {session}
          onToggleTheme={toggleTheme}
          onBack={() => activeTab = 'home'}
        />

      {:else if activeTab === 'settings'}
        <!-- Settings & Project Information -->
        <div class="w-full flex flex-col gap-4 px-6 pb-24 pt-2 animate-in fade-in duration-200">
          <div class="flex items-center gap-2">
            <button
              onclick={() => activeTab = 'home'}
              aria-label="Back to Home"
              class="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all {theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-emerald-950/10 text-[#0a4733] hover:bg-emerald-950/20'}"
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

          <!-- Academic Shoutout & PBL Card -->
          <div class="w-full border rounded-xl p-4.5 flex flex-col gap-3 {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
                USTP
              </div>
              <div>
                <h3 class="text-sm font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Justine Roy P. Salvador</h3>
                <p class="text-xs font-semibold {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">Computer Science Student</p>
              </div>
            </div>

            <div class="pt-2 border-t text-xs flex flex-col gap-1.5 {theme === 'dark' ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-600'}">
              <div class="flex justify-between">
                <span class="font-bold">Institution:</span>
                <span class="font-semibold text-right">University of Science and Technology of Southern Philippines (USTP)</span>
              </div>
              <div class="flex justify-between">
                <span class="font-bold">Course & Subject:</span>
                <span class="font-semibold">CS111 - Introduction to Computing</span>
              </div>
              <div class="flex justify-between">
                <span class="font-bold">Milestone:</span>
                <span class="font-semibold">Prelims Project-Based Learning (PBL)</span>
              </div>
            </div>
          </div>

          <!-- Install PWA App Shortcut Card -->
          <div class="w-full border rounded-xl p-4 flex flex-col gap-3 transition-colors {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-extrabold tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Install Ctrl+Savings</h4>
                <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Add to Home Screen as a native app shortcut</p>
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
              <div class="w-full py-2 px-3 rounded-lg text-xs font-bold text-center border {theme === 'dark' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}">
                ✓ App Already Installed on this Device
              </div>
            {:else}
              <button
                onclick={handleInstallPWA}
                class="cursor-pointer w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2v10" />
                  <path d="M17 7l-5 5-5-5" />
                  <rect x="4" y="14" width="16" height="8" rx="2" />
                </svg>
                <span>Download & Install App</span>
              </button>
            {/if}
          </div>

          <!-- App details & Version -->
          <div class="w-full border rounded-lg p-3.5 flex items-center justify-between {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold">Ctrl+Savings App</span>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border {theme === 'dark' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : 'bg-emerald-100/90 border-emerald-300 text-[#0a4733]'}">
                  {APP_VERSION}
                </span>
              </div>
              <p class="text-[11px] {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Prelim Release (Project-Based Learning)</p>
            </div>
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border {theme === 'dark' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-[#0a4733]'}">
              PBL PASSED
            </span>
          </div>
        </div>
      {/if}

    </div>

    {/if}

    {#if session}
      <!-- The Floating Bottom Navigation Bar (Centered FAB and perfectly aligned Home, Savings, Profile) -->
      <BottomNav
        {activeTab}
        {theme}
        onTabChange={(tab) => activeTab = tab}
        onAddClick={() => isAddModalOpen = true}
      />

      <!-- Quick Add Modal -->
      <AddModal
        isOpen={isAddModalOpen}
        {theme}
        currentBalance={availableBudget}
        onClose={() => isAddModalOpen = false}
        onAdd={handleAddTransaction}
      />

      <!-- Allowance Sessions / Cycles Switcher Modal -->
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
        onSelectSession={(id) => { selectedSessionId = id; isSessionModalOpen = false; }}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
      />
    {/if}

    <!-- Floating PWA Install Bubble (Appears on the side/bottom-right above BottomNav when not installed) -->
    {#if showInstallBubble}
      <aside
        transition:fly={{ y: 24, duration: 400, easing: cubicOut }}
        class="pointer-events-auto absolute bottom-22 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-40 p-3.5 rounded-2xl shadow-2xl border backdrop-blur-md flex flex-col gap-2.5 {theme === 'dark' ? 'bg-[#121215]/95 border-emerald-900/60 text-white shadow-emerald-950/20' : 'bg-white/95 border-emerald-200/90 text-zinc-900 shadow-emerald-900/10'}"
        aria-label="Install App Prompt"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 {theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-emerald-50 border border-emerald-100'}">
            <img src="/Logo.png" alt="Logo" class="w-full h-full object-contain" />
          </div>
          <div class="flex-1 min-w-0 pr-1">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black tracking-tight leading-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Install Ctrl+Savings</h5>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded {theme === 'dark' ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 text-[#0a4733]'}">PWA</span>
            </div>
            <p class="text-[11px] leading-snug mt-0.5 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}">Add to home screen for faster zero-lag offline access.</p>
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
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2v10" />
              <path d="M17 7l-5 5-5-5" />
              <rect x="4" y="14" width="16" height="8" rx="2" />
            </svg>
            <span>Install</span>
          </button>
        </div>
      </aside>
    {/if}

  </div>
</div>
