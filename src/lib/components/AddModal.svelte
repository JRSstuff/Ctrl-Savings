<script>
  import { fade, scale, slide } from 'svelte/transition'
  import { cubicOut, elasticOut } from 'svelte/easing'
  import AppIcon from './AppIcon.svelte'

  let { 
    isOpen = false, 
    onClose = () => {}, 
    onAdd = () => {}, 
    theme = 'light', 
    currentBalance = 0,
    safetyLimit = 0,
    onUpdateSafetyLimit = () => {}
  } = $props()

  let step = $state('choose') // 'choose', 'form', 'success'
  let mode = $state('expense') // Default to 'expense'
  let amount = $state('')
  let parsedAmount = $derived(parseFloat(amount) || 0)
  let remainingAfterSpend = $derived(currentBalance - parsedAmount)
  let isOverBudget = $derived(mode === 'expense' && parsedAmount > currentBalance && parsedAmount > 0)
  let isOverSafetyLimit = $derived(mode === 'expense' && safetyLimit > 0 && parsedAmount > safetyLimit)
  let overrideSafetyLimit = $state(false)
  let title = $state('')
  let category = $state('Food')
  let selectedEmoji = $state('🍔')
  let activePreset = $state('') // Starts unselected!
  let detectedLabel = $state('')
  let showEmojiDrawer = $state(false)
  let isSubmitting = $state(false)
  let formError = $state('')
  let lastSubmitted = $state({ amount: 0, mode: 'expense', description: '', emoji: '🍔' })

  const EMOJI_DICTIONARY = [
    { keywords: ['coffee', 'starbucks', 'cafe', 'tea', 'latte', 'milktea', 'boba'], emoji: '☕', category: 'Coffee' },
    { keywords: ['burger', 'jollibee', 'mcdo', 'kfc', 'fastfood', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'canteen'], emoji: '🍔', category: 'Food' },
    { keywords: ['pizza', 'pasta', 'shakeys', 'greenwich'], emoji: '🍕', category: 'Food' },
    { keywords: ['chicken', 'inasal', 'fried'], emoji: '🍗', category: 'Food' },
    { keywords: ['rice', 'silog', 'chowking'], emoji: '🍚', category: 'Food' },
    { keywords: ['snack', 'bread', 'bakery', 'donut'], emoji: '🍩', category: 'Snacks' },
    { keywords: ['drink', 'coke', 'beer', 'soda'], emoji: '🥤', category: 'Drinks' },
    { keywords: ['jeep', 'jeepney', 'fare', 'commute', 'bus', 'transpo', 'transport'], emoji: '🚌', category: 'Transport' },
    { keywords: ['angkas', 'moveit', 'joyride', 'motor', 'motorcycle', 'trike', 'tricycle'], emoji: '🛵', category: 'Transport' },
    { keywords: ['taxi', 'grab', 'car'], emoji: '🚖', category: 'Transport' },
    { keywords: ['gas', 'fuel', 'petrol', 'diesel', 'shell', 'caltex', 'petron'], emoji: '⛽', category: 'Fuel' },
    { keywords: ['grocery', 'groceries', 'market', 'puregold', 'supermarket', 'sm'], emoji: '🛒', category: 'Groceries' },
    { keywords: ['school', 'tuition', 'ustp', 'book', 'paper', 'print', 'xerox', 'supplies', 'pen', 'exam'], emoji: '📚', category: 'School' },
    { keywords: ['bill', 'electric', 'meralco', 'power', 'more', 'water'], emoji: '💡', category: 'Bills' },
    { keywords: ['wifi', 'internet', 'load', 'data', 'pldt', 'globe', 'smart'], emoji: '📶', category: 'Internet' },
    { keywords: ['rent', 'boarding', 'room', 'dorm', 'house'], emoji: '🏠', category: 'Rent' },
    { keywords: ['game', 'steam', 'ml', 'valorant', 'cod', 'robux'], emoji: '🎮', category: 'Gaming' },
    { keywords: ['shop', 'shopping', 'shopee', 'lazada', 'clothes', 'shirt', 'shoes'], emoji: '🛍️', category: 'Shopping' },
    { keywords: ['med', 'medicine', 'drug', 'pharmacy', 'doctor', 'hospital'], emoji: '💊', category: 'Health' },
    { keywords: ['allowance', 'baon', 'parents', 'mom', 'dad', 'family'], emoji: '💰', category: 'Allowance' },
    { keywords: ['salary', 'sweldo', 'work', 'job', 'paycheck'], emoji: '💼', category: 'Salary' },
    { keywords: ['gift', 'regalo', 'bday', 'birthday'], emoji: '🎁', category: 'Gift' },
    { keywords: ['save', 'savings', 'bank', 'bpi', 'bdo', 'gcash'], emoji: '🏦', category: 'Savings' },
    { keywords: ['hustle', 'freelance', 'commission', 'online'], emoji: '🚀', category: 'Side Hustle' }
  ]

  const POPULAR_EMOJIS = ['🍔', '☕', '🍕', '🍗', '🚌', '🛵', '⛽', '🛒', '📚', '💡', '📶', '🛍️', '🎮', '💊', '🏠', '💰', '🎁', '💼', '🏦', '🚀']

  const expensePresets = [
    { label: 'Food', icon: '🍔' },
    { label: 'Transport', icon: '🚌' },
    { label: 'School', icon: '📚' },
    { label: 'Bills', icon: '💡' },
    { label: 'Snacks', icon: '☕' },
    { label: 'Shopping', icon: '🛍️' }
  ]

  const incomePresets = [
    { label: 'Allowance', icon: '💰' },
    { label: 'Gift', icon: '🎁' },
    { label: 'Salary', icon: '💼' },
    { label: 'Savings', icon: '🏦' },
    { label: 'Side Hustle', icon: '🚀' },
    { label: 'Other', icon: '✨' }
  ]

  // Reset modal state whenever opened
  $effect(() => {
    if (isOpen) {
      step = 'choose'
      amount = ''
      title = ''
      activePreset = ''
      detectedLabel = ''
      formError = ''
      showEmojiDrawer = false
      isSubmitting = false
      overrideSafetyLimit = false
      showSafetyConfig = false
      tempSafetyInput = safetyLimit > 0 ? safetyLimit.toString() : ''
    }
  })

  // Dynamic emoji search when user types in the Note field (only active when NO preset is locked)
  $effect(() => {
    if (!activePreset && title.trim()) {
      const lower = title.toLowerCase()
      for (const item of EMOJI_DICTIONARY) {
        if (item.keywords.some(k => lower.includes(k))) {
          selectedEmoji = item.emoji
          detectedLabel = item.category
          category = item.category
          return
        }
      }
      detectedLabel = ''
    }
  })

  function selectMode(chosenMode) {
    mode = chosenMode
    activePreset = '' // No preset locked
    title = ''
    detectedLabel = ''
    selectedEmoji = mode === 'expense' ? '💸' : '💰'
    category = mode === 'expense' ? 'Spend' : 'Allowance'
    step = 'form'
    formError = ''
  }

  // Toggle quick preset: clicking an active preset deselects it!
  function togglePreset(p) {
    if (activePreset === p.label) {
      // DESELECT: Unlocks custom note and emoji picker!
      activePreset = ''
      category = mode === 'expense' ? 'Spend' : 'Allowance'
      selectedEmoji = mode === 'expense' ? '💸' : '💰'
      title = ''
      detectedLabel = ''
    } else {
      // SELECT: Locks to this preset!
      activePreset = p.label
      category = p.label
      selectedEmoji = p.icon
      title = '' // Clear custom note so preset is clean
      detectedLabel = ''
      showEmojiDrawer = false
    }
  }

  function pickCustomEmoji(em) {
    if (activePreset) return // cannot change emoji while preset is locked
    selectedEmoji = em
    showEmojiDrawer = false
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      formError = 'Please enter a valid amount greater than 0'
      return
    }

    if (mode === 'expense' && safetyLimit > 0 && parsedAmount > safetyLimit && !overrideSafetyLimit) {
      formError = `Exceeds your Safety Spend Limit of ₱${safetyLimit.toFixed(2)}. Please review and check the safety override authorization below to proceed.`
      return
    }

    isSubmitting = true
    formError = ''

    // If preset was chosen, use preset name. If custom note, use custom note.
    const cleanDesc = activePreset
      ? `${selectedEmoji} ${activePreset}`
      : (title.trim() ? `${selectedEmoji} ${title.trim()}` : `${selectedEmoji} ${category}`)

    const payload = {
      type: mode,
      description: cleanDesc,
      amount: parsedAmount,
      category: `${selectedEmoji} ${category}`
    }

    try {
      const res = await onAdd(payload)
      if (res && res.success === false) {
        formError = res.error || 'Failed to record transaction'
        isSubmitting = false
        return
      }

      // Trigger satisfying celebration screen
      lastSubmitted = { 
        amount: parsedAmount, 
        mode, 
        description: activePreset || title.trim() || category,
        emoji: selectedEmoji
      }
      step = 'success'
      isSubmitting = false

      // Auto-close after celebration
      setTimeout(() => {
        if (step === 'success') {
          handleClose()
        }
      }, 1500)
    } catch (err) {
      formError = err.message || 'Network error occurred'
      isSubmitting = false
    }
  }

  function handleClose() {
    step = 'choose'
    amount = ''
    title = ''
    activePreset = ''
    detectedLabel = ''
    formError = ''
    showEmojiDrawer = false
    onClose()
  }

  function handleBackdropKey(e) {
    if (e.key === 'Escape') handleClose()
  }
</script>

<svelte:window onkeydown={handleBackdropKey} />

{#if isOpen}
  <!-- Backdrop Overlay -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Transaction Modal"
    tabindex="-1"
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
  >
    <!-- Background Click Handler -->
    <button
      type="button"
      aria-label="Close modal"
      onclick={handleClose}
      class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
    ></button>

    <!-- Modal Card Container (Adapts cleanly to dark & light theme) -->
    <div
      class="relative z-10 w-full max-w-md {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'} rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border flex flex-col gap-5 animate-in slide-in-from-bottom-8 duration-250 overflow-hidden"
    >

      <!-- ================================================================ -->
      <!-- STEP 1: CHOOSE ACTION                                            -->
      <!-- Payment Button is MASSIVE & COMMANDING compared to Add Money!    -->
      <!-- ================================================================ -->
      {#if step === 'choose'}
        <div class="flex items-center justify-between border-b pb-3.5 {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}">
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">New Transaction</span>
            <h3 class="text-xl font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Select Action</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onclick={handleClose}
            class="cursor-pointer p-1.5 rounded-full {theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'} transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex flex-col gap-4 py-2">
          <!-- CARD 1: Payment / Spend (HERO SIZE: Noticeably larger, prominent, bold & commanding!) -->
          <button
            type="button"
            onclick={() => selectMode('expense')}
            class="w-full text-left p-6 rounded-2xl border-2 transition-all duration-150 cursor-pointer active:scale-96 flex items-center justify-between group shadow-xl {theme === 'dark' ? 'bg-[#18181b] border-emerald-400 hover:bg-[#222228] shadow-emerald-500/10' : 'bg-white border-[#0a4733] hover:bg-emerald-50/40 shadow-[#0a4733]/15'}"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-md shrink-0 {theme === 'dark' ? 'bg-emerald-500 text-black ring-4 ring-emerald-500/30' : 'bg-[#0a4733] text-white ring-4 ring-[#0a4733]/20'}">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  <circle cx="18" cy="14" r="1" fill="currentColor" />
                </svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-xl font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Payment / Spend</h4>
                  <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">Primary</span>
                </div>
                <p class="text-xs font-semibold mt-1 {theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}">Record food, fares, school, or bills</p>
              </div>
            </div>
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'} shadow-md transition-all">
              <svg class="w-5 h-5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </button>

          <!-- Divider label -->
          <div class="flex items-center gap-2 px-1">
            <div class="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
            <span class="text-[10px] font-extrabold uppercase tracking-widest {theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}">or deposit cash</span>
            <div class="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
          </div>

          <!-- CARD 2: Add Money (Compact Secondary Action Bar) -->
          <button
            type="button"
            onclick={() => selectMode('income')}
            class="w-full text-left py-3.5 px-4 rounded-xl border transition-all duration-150 cursor-pointer active:scale-97 flex items-center justify-between group {theme === 'dark' ? 'bg-[#121215] border-zinc-800 hover:border-zinc-700 hover:bg-[#18181c]' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/80'}"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 {theme === 'dark' ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-100 text-[#0a4733]'}">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div class="min-w-0">
                <h4 class="text-sm font-bold tracking-tight {theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}">Add Money (Allowance / Cash In)</h4>
                <p class="text-[11px] font-medium {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Deposit allowance, gift, or salary</p>
              </div>
            </div>
            <div class="text-xs font-bold px-2.5 py-1 rounded-md border {theme === 'dark' ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'}">
              + Add
            </div>
          </button>
        </div>

        <!-- High-Contrast Cancel Button -->
        <div class="flex justify-center pt-1">
          <button
            type="button"
            onclick={handleClose}
            class="text-xs font-extrabold py-2 px-5 rounded-lg cursor-pointer transition-colors {theme === 'dark' ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/80' : 'text-zinc-700 hover:text-black hover:bg-zinc-100'}"
          >
            Cancel
          </button>
        </div>

      <!-- ================================================================ -->
      <!-- STEP 2: FORM (Quick Presets Deselectable & Lock Note/Emoji)       -->
      <!-- ================================================================ -->
      {:else if step === 'form'}
        <div class="flex items-center justify-between border-b pb-3.5 {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}">
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => { step = 'choose'; formError = ''; }}
              aria-label="Back to menu"
              class="cursor-pointer p-1.5 rounded-full {theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-black'} transition-colors"
            >
              <svg class="w-5 h-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider {mode === 'expense' ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : 'text-emerald-500'}">
                {mode === 'expense' ? 'Cash Out' : 'Cash In'}
              </span>
              <h3 class="text-xl font-black tracking-tight leading-none {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                {mode === 'expense' ? 'Payment / Spend' : 'Add Money'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onclick={handleClose}
            class="cursor-pointer p-1.5 rounded-full {theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-black'} transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {#if formError}
          <div class="p-3 rounded-lg border bg-red-500/10 border-red-500/40 text-red-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <svg class="w-4 h-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{formError}</span>
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="flex flex-col gap-4">
          <!-- Big Satisfying Amount Input -->
          <div class="flex flex-col gap-1">
            <label for="tx-amount" class="text-[11px] font-extrabold uppercase tracking-wider {theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}">
              Amount (PHP)
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-3xl font-black {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">₱</span>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                bind:value={amount}
                required
                class="w-full pl-12 pr-4 py-3.5 text-3xl font-black rounded-xl border-2 transition-all focus:outline-none {isOverBudget ? 'border-red-500 ring-2 ring-red-500/20' : (theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-zinc-50/60 border-zinc-300 text-zinc-900 focus:border-[#0a4733]')}"
              />
            </div>
          </div>

          <!-- Live Balance Preview & Over-Budget Warning -->
          {#if mode === 'expense'}
            <div class="p-3 rounded-xl border flex flex-col gap-1.5 transition-colors {isOverBudget ? 'bg-red-500/10 border-red-500/40 text-red-500' : (theme === 'dark' ? 'bg-[#18181b] border-zinc-800' : 'bg-zinc-100/80 border-zinc-200')}">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Current Available Cash:</span>
                <span class="font-black {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">₱{currentBalance.toFixed(2)}</span>
              </div>

              {#if parsedAmount > 0}
                <div class="flex items-center justify-between text-xs pt-1.5 border-t {isOverBudget ? 'border-red-500/20' : (theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}">
                  <span class="font-bold">Remaining After Spend:</span>
                  <span class="font-black text-sm {isOverBudget ? 'text-red-500 font-mono' : (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]')}">
                    {remainingAfterSpend < 0 ? '-' : ''}₱{Math.abs(remainingAfterSpend).toFixed(2)}
                  </span>
                </div>
              {/if}

              {#if isOverBudget}
                <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-red-500 pt-1 animate-in fade-in">
                  <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Warning: This exceeds your available cash by ₱{(parsedAmount - currentBalance).toFixed(2)}!</span>
                </div>
              {/if}
            </div>

            <!-- Safety Spend Limit Exceeded Warning (Only shown if over limit) -->
            {#if isOverSafetyLimit}
              <div class="p-3 rounded-xl border flex flex-col gap-2 transition-all animate-in fade-in {theme === 'dark' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'}">
                <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-500">
                  <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Above Safety Limit (₱{(parsedAmount - safetyLimit).toFixed(2)} over ₱{safetyLimit.toFixed(0)} limit)</span>
                </div>
                <label class="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    bind:checked={overrideSafetyLimit}
                    class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                  <span class="{overrideSafetyLimit ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]') : 'text-zinc-500 dark:text-zinc-400'}">
                    I confirm and authorize this large expense
                  </span>
                </label>
              </div>
            {/if}
          {:else}
            <!-- Mode is Income -->
            <div class="p-3 rounded-xl border flex items-center justify-between text-xs {theme === 'dark' ? 'bg-[#18181b] border-zinc-800' : 'bg-emerald-50/70 border-emerald-200/70'}">
              <span class="font-bold {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/80'}">Available Cash After Deposit:</span>
              <span class="font-black text-sm {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">
                ₱{(currentBalance + parsedAmount).toFixed(2)}
              </span>
            </div>
          {/if}

          <!-- Quick Presets Selector (Deselectable!) -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold uppercase tracking-wider {theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}">
                Quick Presets (Tap to select or deselect)
              </span>
              {#if activePreset}
                <button
                  type="button"
                  onclick={() => togglePreset({ label: activePreset, icon: selectedEmoji })}
                  class="text-[10px] font-bold underline cursor-pointer {theme === 'dark' ? 'text-emerald-400 hover:text-white' : 'text-[#0a4733] hover:text-black'}"
                >
                  Deselect
                </button>
              {/if}
            </div>

            <div class="grid grid-cols-3 gap-2">
              {#each (mode === 'expense' ? expensePresets : incomePresets) as p}
                <button
                  type="button"
                  onclick={() => togglePreset(p)}
                  class="cursor-pointer py-2 px-2 rounded-xl border text-xs font-bold transition-all duration-100 flex items-center justify-center gap-1.5 active:scale-95 {activePreset === p.label ? (mode === 'expense' ? (theme === 'dark' ? 'bg-white text-black border-white shadow-md font-black ring-2 ring-emerald-400' : 'bg-[#0a4733] text-white border-[#0a4733] shadow-md font-black ring-2 ring-[#0a4733]/30') : (theme === 'dark' ? 'bg-emerald-500 text-black border-emerald-500 shadow-md font-black ring-2 ring-emerald-400' : 'bg-[#22c55e] text-white border-[#22c55e] shadow-md font-black ring-2 ring-[#22c55e]/30')) : (theme === 'dark' ? 'bg-[#18181b] border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200/80')}"
                >
                  <AppIcon name={p.label} size={15} />
                  <span class="truncate">{p.label}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Note / Description (LOCKED if preset is chosen! UNLOCKED if no preset) -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="tx-note" class="text-[11px] font-extrabold uppercase tracking-wider {theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}">
                Custom Note & Emoji
              </label>
              {#if activePreset}
                <span class="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                  🔒 Locked to {selectedEmoji} {activePreset}
                </span>
              {:else if detectedLabel}
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-in fade-in">
                  Auto-found: {selectedEmoji} {detectedLabel}
                </span>
              {/if}
            </div>
            
            <div class="flex items-center gap-2">
              <!-- Clickable Emoji Badge (Disabled when preset is locked) -->
              <button
                type="button"
                disabled={Boolean(activePreset)}
                onclick={() => showEmojiDrawer = !showEmojiDrawer}
                aria-label="Change emoji"
                class="w-11 h-11 rounded-xl border-2 flex items-center justify-center text-xl transition-all shrink-0 {activePreset ? 'opacity-50 cursor-not-allowed bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800' : 'cursor-pointer active:scale-95 ' + (theme === 'dark' ? 'bg-[#18181b] border-zinc-700 hover:border-emerald-400' : 'bg-zinc-100 border-zinc-300 hover:border-[#0a4733]')}"
                title={activePreset ? "Deselect quick preset above to customize emoji" : "Click to pick emoji"}
              >
                {selectedEmoji}
              </button>

              <input
                id="tx-note"
                type="text"
                disabled={Boolean(activePreset)}
                placeholder={activePreset ? `Preset: ${selectedEmoji} ${activePreset} (tap above to deselect & type)` : (mode === 'expense' ? 'e.g. Jeepney, Lunch, Coffee, Book' : 'e.g. Allowance from Mom, Gift')}
                bind:value={title}
                class="flex-1 px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none {activePreset ? 'opacity-60 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-800 text-zinc-500 font-medium' : (theme === 'dark' ? 'bg-[#09090b] border-zinc-700 text-white focus:border-emerald-400' : 'bg-zinc-50/60 border-zinc-300 text-zinc-900 focus:border-[#0a4733]')}"
              />
            </div>

            <!-- Emoji Customizer Drawer (Only visible when unlocked) -->
            {#if showEmojiDrawer && !activePreset}
              <div 
                transition:slide={{ duration: 200 }}
                class="p-2.5 rounded-xl border flex flex-wrap gap-2 justify-center {theme === 'dark' ? 'bg-[#18181b] border-zinc-800' : 'bg-zinc-100/90 border-zinc-200'}"
              >
                {#each POPULAR_EMOJIS as em}
                  <button
                    type="button"
                    onclick={() => pickCustomEmoji(em)}
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer {selectedEmoji === em ? 'bg-emerald-500/30 ring-2 ring-emerald-400' : ''}"
                  >
                    {em}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Primary Action Button & High-Contrast Cancel Button -->
          <div class="flex flex-col gap-2 pt-2">
            <!-- Spend Button is Commanding & Prominent! -->
            <button
              type="submit"
              disabled={isSubmitting || !amount || (isOverSafetyLimit && !overrideSafetyLimit)}
              class="w-full py-4.5 px-6 rounded-2xl font-black text-base cursor-pointer transition-all duration-150 active:scale-95 shadow-xl flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed {mode === 'expense' ? (theme === 'dark' ? 'bg-white hover:bg-zinc-100 text-black shadow-white/10' : 'bg-[#0a4733] hover:bg-[#0c5940] text-white shadow-[#0a4733]/30') : (theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-[#22c55e] hover:bg-[#1ea951] text-white shadow-[#22c55e]/30')}"
            >
              {#if isSubmitting}
                <div class="w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Recording...</span>
              {:else if mode === 'expense'}
                {#if isOverSafetyLimit && !overrideSafetyLimit}
                  <span>⚠️ Authorize Limit Above to Spend</span>
                {:else}
                  <svg class="w-5 h-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Confirm ₱{amount ? parseFloat(amount).toFixed(2) : '0.00'} Spend</span>
                {/if}
              {:else}
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Deposit ₱{amount ? parseFloat(amount).toFixed(2) : '0.00'} Cash</span>
              {/if}
            </button>

            <!-- High-Contrast Cancel Button -->
            <button
              type="button"
              onclick={handleClose}
              class="text-xs font-extrabold py-2 px-4 rounded-lg cursor-pointer transition-colors text-center {theme === 'dark' ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/80' : 'text-zinc-700 hover:text-black hover:bg-zinc-100'}"
            >
              Cancel
            </button>
          </div>
        </form>

      <!-- ================================================================ -->
      <!-- STEP 3: SATISFYING ADDICTING SUCCESS ANIMATION                  -->
      <!-- ================================================================ -->
      {:else if step === 'success'}
        <div class="flex flex-col items-center justify-center py-8 text-center gap-4 animate-in zoom-in-95 duration-250">
          
          <!-- Animated Pop Checkmark Ring with Glow Burst -->
          <div class="relative flex items-center justify-center">
            <!-- Pulsing outer wave -->
            <div class="absolute w-28 h-28 rounded-full animate-ping opacity-30 {lastSubmitted.mode === 'income' ? 'bg-emerald-500' : (theme === 'dark' ? 'bg-white' : 'bg-[#0a4733]')}"></div>
            
            <!-- Central Icon Pop with Emoji -->
            <div class="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl transition-transform text-3xl {lastSubmitted.mode === 'income' ? 'bg-emerald-500 text-black shadow-emerald-500/30' : (theme === 'dark' ? 'bg-white text-black shadow-white/20' : 'bg-[#0a4733] text-white shadow-[#0a4733]/30')} animate-in zoom-in duration-300">
              {lastSubmitted.emoji}
            </div>
          </div>

          <!-- Status Text -->
          <div class="flex flex-col gap-1">
            <span class="text-xs font-black uppercase tracking-widest {lastSubmitted.mode === 'income' ? 'text-emerald-500' : (theme === 'dark' ? 'text-zinc-300' : 'text-[#0a4733]')}">
              {lastSubmitted.mode === 'income' ? '★ CASH DEPOSITED ★' : '✓ SPEND RECORDED'}
            </span>
            <h2 class="text-4xl font-black tracking-tight {lastSubmitted.mode === 'income' ? (theme === 'dark' ? 'text-emerald-400' : 'text-[#22c55e]') : (theme === 'dark' ? 'text-white' : 'text-zinc-900')}">
              {lastSubmitted.mode === 'income' ? '+' : '-'}₱{lastSubmitted.amount.toFixed(2)}
            </h2>
            <p class="text-xs font-semibold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'} mt-0.5">
              {lastSubmitted.description}
            </p>
          </div>

          <!-- Quick Dismiss -->
          <button
            type="button"
            onclick={handleClose}
            class="mt-2 text-xs font-extrabold px-5 py-2 rounded-full border transition-all cursor-pointer active:scale-95 {theme === 'dark' ? 'border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700' : 'border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-zinc-200'}"
          >
            Done
          </button>
        </div>
      {/if}

    </div>
  </div>
{/if}
