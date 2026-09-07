<script>
  import { fade, slide, scale } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  let {
    isOpen = false,
    theme = 'light',
    sessions = [],
    activeSessionId = '',
    selectedSessionId = '',
    transactions = [],
    apiError = '',
    onClearError = () => {},
    onClose = () => {},
    onStartNewSession = () => {},
    onSelectSession = () => {},
    onEditSession = () => {},
    onDeleteSession = () => {}
  } = $props()

  let isCreatingNew = $state(false)
  let newSessionName = $state('')
  let newSessionDesc = $state('')
  let newGoalAmount = $state('')
  let newGoalTitle = $state('')
  let hasGoal = $state(false)
  let createError = $state('')

  // Full cycle editing
  let editingSessionId = $state(null)
  let editName = $state('')
  let editDesc = $state('')
  let editGoalAmount = $state('')
  let editGoalTitle = $state('')

  // Delete confirmation
  let confirmDeleteId = $state(null)

  const CYCLE_PRESETS = [
    { name: 'Weekly Baon', icon: '⚡', goal: '300', goalTitle: 'Baon Savings Cushion' },
    { name: 'School Week', icon: '🎒', goal: '500', goalTitle: 'Project & Photocopy Fund' },
    { name: 'Savings Sprint', icon: '🎯', goal: '1000', goalTitle: 'Emergency Stash' },
    { name: 'Weekend Trip', icon: '🍕', goal: '200', goalTitle: 'Food & Hangout' },
    { name: 'Payday Cutoff', icon: '📅', goal: '1500', goalTitle: 'Cutoff Savings' }
  ]

  const GOAL_PRESETS = ['200', '500', '1000', '2000']

  function applyPreset(p) {
    newSessionName = p.name
    newGoalAmount = p.goal
    newGoalTitle = p.goalTitle
    hasGoal = true
    createError = ''
  }

  function getSessionStats(s) {
    const sCreated = s.createdAt || s.created_at
    const sClosed = s.closedAt || s.closed_at
    const start = new Date(sCreated).getTime()
    const end = sClosed ? new Date(sClosed).getTime() : Infinity
    const sTx = transactions.filter(t => {
      const tTime = new Date(t.created_at).getTime()
      return tTime >= start && tTime <= end
    })
    const income = sTx.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0)
    const expense = sTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0)
    const balance = income - expense
    return {
      income,
      expense,
      balance,
      count: sTx.length
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newSessionName.trim()) {
      createError = 'Please give your new cycle a name (e.g. Week 2 Baon)'
      return
    }

    const res = await onStartNewSession({
      name: newSessionName.trim(),
      description: newSessionDesc.trim(),
      goalAmount: hasGoal ? (parseFloat(newGoalAmount) || 0) : 0,
      goalTitle: hasGoal ? (newGoalTitle.trim() || 'Savings Goal') : ''
    })

    if (res && res.success === false) {
      // Don't close form, user can see the error banner and fix/retry
      return
    }

    newSessionName = ''
    newSessionDesc = ''
    newGoalAmount = ''
    newGoalTitle = ''
    hasGoal = false
    createError = ''
    isCreatingNew = false
  }

  function startEditSession(s) {
    editingSessionId = s.id
    editName = s.name || ''
    editDesc = s.description || ''
    const gAmt = s.goalAmount || s.goal_amount
    editGoalAmount = gAmt ? String(gAmt) : ''
    editGoalTitle = s.goalTitle || s.goal_title || ''
  }

  async function saveEditSession(sessionId) {
    if (!editName.trim()) return
    const res = await onEditSession(sessionId, {
      name: editName.trim(),
      description: editDesc.trim(),
      goalAmount: parseFloat(editGoalAmount) || 0,
      goalTitle: editGoalTitle.trim()
    })
    if (res && res.success === false) {
      return
    }
    editingSessionId = null
  }

  async function confirmDelete(sessionId) {
    const res = await onDeleteSession(sessionId)
    if (res && res.success === false) {
      return
    }
    confirmDeleteId = null
  }

  function formatDateRange(s) {
    const sCreated = s.createdAt || s.created_at
    const sClosed = s.closedAt || s.closed_at
    const dStart = new Date(sCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!sClosed) return `Started ${dStart} • Live Ongoing Cycle`
    const dEnd = new Date(sClosed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${dStart} - ${dEnd}`
  }

  function handleBackdropKey(e) {
    if (e.key === 'Escape') onClose()
  }
</script>

<svelte:window onkeydown={handleBackdropKey} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Allowance Sessions Manager"
    tabindex="-1"
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
  >
    <!-- Background Click Handler -->
    <button
      type="button"
      aria-label="Close modal"
      onclick={onClose}
      class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
    ></button>

    <!-- Modal Card Container -->
    <div
      class="relative z-10 w-full max-w-lg {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-200 max-h-[92vh] overflow-y-auto"
    >
      <!-- Header Bar -->
      <div class="flex items-center justify-between border-b pb-3 {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shadow-md {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
            🗂️
          </div>
          <div>
            <h3 class="text-lg font-black tracking-tight leading-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
              Allowance Cycles
            </h3>
            <p class="text-[11px] font-semibold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
              Saved in database • Synced across all devices
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onclick={onClose}
          class="cursor-pointer p-2 rounded-full {theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'} transition-colors"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- API Error Banner Inside Modal -->
      {#if apiError}
        <div
          role="alert"
          class="p-3.5 rounded-2xl border-2 border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 text-xs flex items-start justify-between gap-3 animate-in fade-in select-text"
        >
          <div class="flex items-start gap-2.5 min-w-0 flex-1">
            <span class="font-black text-sm text-red-500 shrink-0">⚠️</span>
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <span class="font-black uppercase tracking-wider text-[10px] text-red-600 dark:text-red-400">Database / API Error</span>
              <span class="font-mono text-xs break-all leading-tight select-text">{apiError}</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onclick={onClearError}
            class="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-black shrink-0 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      {/if}

      <!-- Action Trigger or Creation Form -->
      {#if !isCreatingNew}
        <button
          type="button"
          onclick={() => isCreatingNew = true}
          class="w-full py-3.5 px-4 rounded-2xl font-black text-sm cursor-pointer transition-all duration-150 active:scale-97 shadow-lg flex items-center justify-center gap-2 group {theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-[#0a4733] hover:bg-[#0d5940] text-white shadow-[#0a4733]/20'}"
        >
          <svg class="w-5 h-5 stroke-[3] group-hover:rotate-90 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Start New Allowance Cycle (Reset to ₱0.00)</span>
        </button>
      {:else}
        <!-- Form to Launch New Cycle (Addictive, Minimalist & Gamified) -->
        <form
          onsubmit={handleCreate}
          transition:slide={{ duration: 200 }}
          class="p-4 sm:p-5 rounded-2xl border-2 flex flex-col gap-3.5 shadow-md {theme === 'dark' ? 'bg-[#18181b] border-emerald-500/60' : 'bg-emerald-50/80 border-[#0a4733]/40'}"
        >
          <div class="flex items-center justify-between border-b pb-2 {theme === 'dark' ? 'border-zinc-800' : 'border-emerald-200/60'}">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">🚀</span>
              <h4 class="text-xs font-black uppercase tracking-wider {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">
                New Cycle Setup
              </h4>
            </div>
            <button
              type="button"
              onclick={() => isCreatingNew = false}
              class="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>

          {#if createError}
            <div class="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">
              {createError}
            </div>
          {/if}

          <!-- Quick Presets -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}">
              Quick Presets (Tap to Auto-Fill)
            </span>
            <div class="flex flex-wrap gap-1.5">
              {#each CYCLE_PRESETS as p}
                <button
                  type="button"
                  onclick={() => applyPreset(p)}
                  class="cursor-pointer py-1 px-2.5 rounded-lg text-xs font-bold border transition-all active:scale-95 flex items-center gap-1 {newSessionName === p.name ? (theme === 'dark' ? 'bg-emerald-500 text-black border-emerald-400 shadow-xs' : 'bg-[#0a4733] text-white border-[#0a4733] shadow-xs') : (theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100')}"
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Cycle Name Input -->
          <div class="flex flex-col gap-1">
            <label for="new-sess-name" class="text-[10px] font-black uppercase tracking-wider {theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}">
              Cycle Name
            </label>
            <input
              id="new-sess-name"
              type="text"
              placeholder="e.g. Week 2 Baon, Finals Week, Cutoff 15"
              bind:value={newSessionName}
              required
              class="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none transition-all {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
            />
          </div>

          <!-- Goal Tracker Section (Gamified & Addictive) -->
          <div class="p-3 rounded-xl border flex flex-col gap-2.5 {theme === 'dark' ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/90 border-emerald-200/80'}">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-sm">🎯</span>
                <span class="text-xs font-black {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Set a Savings Goal (Optional)</span>
              </div>
              <button
                type="button"
                onclick={() => hasGoal = !hasGoal}
                class="text-[11px] font-extrabold cursor-pointer underline {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}"
              >
                {hasGoal ? 'Remove Goal' : '+ Add Target'}
              </button>
            </div>

            {#if hasGoal}
              <div transition:slide={{ duration: 150 }} class="flex flex-col gap-2 pt-1">
                <!-- Goal Preset Chips -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-bold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Target:</span>
                  {#each GOAL_PRESETS as amt}
                    <button
                      type="button"
                      onclick={() => newGoalAmount = amt}
                      class="cursor-pointer px-2 py-0.5 rounded-md text-[11px] font-black border transition-all active:scale-95 {newGoalAmount === amt ? (theme === 'dark' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-[#0a4733] text-white border-[#0a4733]') : (theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-300 text-zinc-700')}"
                    >
                      ₱{amt}
                    </button>
                  {/each}
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="relative flex items-center">
                    <span class="absolute left-2.5 text-xs font-bold text-zinc-400">₱</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Target Amount"
                      bind:value={newGoalAmount}
                      class="w-full pl-7 pr-2.5 py-1.5 rounded-lg border text-xs font-bold focus:outline-none {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Save for Sneakers"
                    bind:value={newGoalTitle}
                    class="w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium focus:outline-none {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
                  />
                </div>
              </div>
            {/if}
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-1">
            <button
              type="button"
              onclick={() => isCreatingNew = false}
              class="flex-1 py-2.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer {theme === 'dark' ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'}"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-2 py-2.5 rounded-xl font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
            >
              <span>Launch Cycle (Start at ₱0.00)</span>
              <span>🚀</span>
            </button>
          </div>
        </form>
      {/if}

      <!-- Sessions List -->
      <div class="flex flex-col gap-3 pt-1">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
            Allowance Cycles ({sessions.length})
          </span>
          <span class="text-[10px] font-bold text-zinc-400">Synced to Database</span>
        </div>

        <div class="flex flex-col gap-3">
          {#each sessions as s (s.id)}
            {@const stats = getSessionStats(s)}
            {@const isActive = s.id === activeSessionId}
            {@const isSelected = s.id === selectedSessionId}
            {@const sGoalAmount = Number(s.goalAmount || s.goal_amount) || 0}
            {@const sGoalTitle = s.goalTitle || s.goal_title || ''}
            {@const hasSessionGoal = sGoalAmount > 0}
            {@const percentReached = sGoalAmount > 0 ? Math.min(100, Math.max(0, Math.round((stats.balance / sGoalAmount) * 100))) : 0}
            {@const isGoalComplete = sGoalAmount > 0 && stats.balance >= sGoalAmount}

            <div
              class="w-full p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 shadow-xs {isSelected ? (theme === 'dark' ? 'bg-[#18181b] border-emerald-400 shadow-md shadow-emerald-500/10' : 'bg-white border-[#0a4733] shadow-md shadow-[#0a4733]/15') : (theme === 'dark' ? 'bg-[#121215] border-zinc-800/80 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300')}"
            >
              <!-- Card Header with Edit, Delete & Select buttons -->
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-base font-black tracking-tight truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                      {s.name}
                    </h4>
                    {#if isActive}
                      <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-black flex items-center gap-1 ring-2 ring-emerald-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
                        Active Cycle
                      </span>
                    {:else}
                      <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full {theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}">
                        Archived
                      </span>
                    {/if}
                  </div>
                  <p class="text-[11px] font-semibold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5">
                    {formatDateRange(s)}
                  </p>
                  {#if s.description}
                    <p class="text-xs font-medium italic mt-0.5 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}">
                      "{s.description}"
                    </p>
                  {/if}
                </div>

                <!-- Card Actions: Edit, Delete, View -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <!-- Edit Button -->
                  <button
                    type="button"
                    aria-label="Edit Cycle"
                    onclick={() => startEditSession(s)}
                    class="p-1.5 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95 {theme === 'dark' ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:text-zinc-900 hover:border-zinc-400'}"
                    title="Edit Cycle Details"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  <!-- Delete Button -->
                  <button
                    type="button"
                    aria-label="Delete Cycle"
                    onclick={() => confirmDeleteId = s.id}
                    class="p-1.5 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95 text-red-500 hover:bg-red-500/10 {theme === 'dark' ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}"
                    title="Delete Cycle"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>

                  <!-- View Button -->
                  {#if !isSelected}
                    <button
                      type="button"
                      onclick={() => onSelectSession(s.id)}
                      class="text-xs font-black py-1.5 px-3 rounded-xl border transition-all cursor-pointer active:scale-95 {theme === 'dark' ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:border-emerald-400' : 'border-zinc-300 text-zinc-800 hover:bg-zinc-100 hover:border-[#0a4733]'}"
                    >
                      View Cycle
                    </button>
                  {:else}
                    <span class="text-[10px] font-black px-2.5 py-1.5 rounded-xl border flex items-center gap-1 {theme === 'dark' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-[#0a4733]'}">
                      ✓ Viewing
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Inline Delete Confirmation Prompt -->
              {#if confirmDeleteId === s.id}
                <div transition:slide={{ duration: 150 }} class="p-3 rounded-xl border bg-red-500/10 border-red-500/40 flex flex-col gap-2">
                  <p class="text-xs font-black text-red-500">
                    Delete "{s.name}"?
                  </p>
                  <p class="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    Transactions recorded during this cycle will remain safely stored in your database.
                  </p>
                  <div class="flex gap-2 pt-1">
                    <button
                      type="button"
                      onclick={() => confirmDeleteId = null}
                      class="flex-1 py-1 text-xs font-bold border rounded-lg {theme === 'dark' ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'}"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onclick={() => confirmDelete(s.id)}
                      class="flex-1 py-1 text-xs font-black rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs transition-colors"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              {/if}

              <!-- Inline Edit Form -->
              {#if editingSessionId === s.id}
                <div transition:slide={{ duration: 150 }} class="p-3.5 rounded-xl border-2 flex flex-col gap-3 {theme === 'dark' ? 'bg-zinc-900 border-emerald-500/50' : 'bg-emerald-50/70 border-emerald-300'}">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Edit Cycle Details</span>
                    <button
                      type="button"
                      onclick={() => editingSessionId = null}
                      class="text-xs font-bold text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div class="flex flex-col gap-1">
                    <label for="edit-name-{s.id}" class="text-[10px] font-black uppercase text-zinc-400">Cycle Name</label>
                    <input
                      id="edit-name-{s.id}"
                      type="text"
                      bind:value={editName}
                      required
                      class="px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                      <label for="edit-goal-amt-{s.id}" class="text-[10px] font-black uppercase text-zinc-400">Target Goal (₱)</label>
                      <input
                        id="edit-goal-amt-{s.id}"
                        type="number"
                        step="1"
                        placeholder="0.00"
                        bind:value={editGoalAmount}
                        class="px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
                      />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label for="edit-goal-title-{s.id}" class="text-[10px] font-black uppercase text-zinc-400">Goal Motivation</label>
                      <input
                        id="edit-goal-title-{s.id}"
                        type="text"
                        placeholder="e.g. New Shoes"
                        bind:value={editGoalTitle}
                        class="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col gap-1">
                    <label for="edit-desc-{s.id}" class="text-[10px] font-black uppercase text-zinc-400">Notes (Optional)</label>
                    <input
                      id="edit-desc-{s.id}"
                      type="text"
                      placeholder="e.g. Budget from parents"
                      bind:value={editDesc}
                      class="px-3 py-1.5 rounded-lg border text-xs focus:outline-none {theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-white border-zinc-300 text-zinc-900 focus:border-[#0a4733]'}"
                    />
                  </div>

                  <div class="flex gap-2 pt-1">
                    <button
                      type="button"
                      onclick={() => editingSessionId = null}
                      class="flex-1 py-1.5 text-xs font-bold border rounded-lg {theme === 'dark' ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'}"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onclick={() => saveEditSession(s.id)}
                      class="flex-1 py-1.5 text-xs font-black rounded-lg cursor-pointer shadow-xs {theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-[#0a4733] text-white hover:bg-[#0d5940]'}"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              {/if}

              <!-- Goal Progress Bar (If configured on this session) -->
              {#if hasSessionGoal}
                <div class="p-3 rounded-xl border flex flex-col gap-1.5 {theme === 'dark' ? 'bg-zinc-900/90 border-zinc-800' : 'bg-emerald-50/70 border-emerald-200/80'}">
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="text-sm">{isGoalComplete ? '🎉' : '🎯'}</span>
                      <span class="font-black truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                        {sGoalTitle || 'Savings Target'}: ₱{sGoalAmount.toFixed(2)}
                      </span>
                    </div>
                    <span class="text-[11px] font-black {isGoalComplete ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : (theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}">
                      {isGoalComplete ? 'Goal Reached!' : `${percentReached}%`}
                    </span>
                  </div>

                  <!-- Animated bar -->
                  <div class="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500 {isGoalComplete ? 'bg-gradient-to-r from-emerald-500 to-green-400' : (theme === 'dark' ? 'bg-emerald-400' : 'bg-[#0a4733]')}"
                      style="width: {percentReached}%"
                    ></div>
                  </div>

                  <div class="flex items-center justify-between text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400">
                    <span>Saved: ₱{stats.balance.toFixed(2)}</span>
                    <span>
                      {#if isGoalComplete}
                        +₱{(stats.balance - sGoalAmount).toFixed(2)} extra saved!
                      {:else}
                        ₱{(sGoalAmount - stats.balance).toFixed(2)} left to reach goal
                      {/if}
                    </span>
                  </div>
                </div>
              {/if}

              <!-- The Hero Stats Bar: Added, Spent, Saved Up (Exactly as requested!) -->
              <div class="grid grid-cols-3 gap-2 pt-1 border-t {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/80'} text-center">
                <div class="flex flex-col py-1 px-1.5 rounded-xl {theme === 'dark' ? 'bg-zinc-900/60' : 'bg-zinc-100/70'}">
                  <span class="text-[9px] font-black uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Added</span>
                  <span class="text-xs font-black {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">+₱{stats.income.toFixed(2)}</span>
                </div>
                <div class="flex flex-col py-1 px-1.5 rounded-xl {theme === 'dark' ? 'bg-zinc-900/60' : 'bg-zinc-100/70'}">
                  <span class="text-[9px] font-black uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Spent</span>
                  <span class="text-xs font-black {theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}">-₱{stats.expense.toFixed(2)}</span>
                </div>
                <!-- SAVED UP: Prominent, Addictive & Celebratory! -->
                <div class="flex flex-col py-1 px-1.5 rounded-xl border {stats.balance >= 0 ? (theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300/80') : 'bg-red-500/10 border-red-500/30'}">
                  <span class="text-[9px] font-black uppercase tracking-wider {stats.balance >= 0 ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : 'text-red-500'}">
                    Saved Up
                  </span>
                  <span class="text-xs font-black tracking-tight {stats.balance >= 0 ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : 'text-red-500'}">
                    {stats.balance < 0 ? '-' : ''}₱{Math.abs(stats.balance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Close Button -->
      <div class="flex justify-center pt-1 border-t {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}">
        <button
          type="button"
          onclick={onClose}
          class="text-xs font-extrabold py-2 px-6 rounded-xl cursor-pointer transition-colors {theme === 'dark' ? 'text-zinc-300 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 hover:text-black hover:bg-zinc-100'}"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
