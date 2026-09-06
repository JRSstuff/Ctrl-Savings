<script>
  import { fade, fly } from 'svelte/transition'
  import { cubicOut, expoInOut } from 'svelte/easing'
  import TopBar from './lib/components/TopBar.svelte'
  import Gauge from './lib/components/Gauge.svelte'
  import SpendingChart from './lib/components/SpendingChart.svelte'
  import BottomNav from './lib/components/BottomNav.svelte'
  import SavingsView from './lib/components/SavingsView.svelte'
  import ProfileView from './lib/components/ProfileView.svelte'
  import AddModal from './lib/components/AddModal.svelte'
  import AuthView from './lib/components/AuthView.svelte'

  // Application State
  const APP_VERSION = 'v1.1.0'
  let appLoaded = $state(false)
  let activeTab = $state('home') // 'home', 'savings', 'profile', 'settings'
  let theme = $state('light') // Default to clean light theme matching the reference design
  let isAddModalOpen = $state(false)
  let deferredPrompt = $state(null)
  let isInstalled = $state(false)
  let isDismissed = $state(false)
  let session = $state(null)

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
    }

    // Check our custom local API session
    const userId = localStorage.getItem('allowance_user_id')
    if (userId) {
      session = userId
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
  let totalBudget = $state(980.00)
  let availableBudget = $state(215.60)
  let transactions = $state([
    { id: 1, title: 'Safeway', date: '5.22.2023', amount: 88.56, category: 'Groceries' },
    { id: 2, title: 'Target', date: '5.19.2023', amount: 34.20, category: 'Groceries' },
    { id: 3, title: 'Whole Foods', date: '5.14.2023', amount: 52.10, category: 'Groceries' }
  ])

  function handleAddExpense(expense) {
    transactions = [
      { id: Date.now(), ...expense },
      ...transactions
    ]
    availableBudget = Math.max(0, availableBudget - expense.amount)
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light'
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

  <!-- Responsive Viewport Frame -->
  <div class="relative w-full max-w-2xl h-full flex flex-col justify-between">
    
    <!-- Hero Animated Logo (Seamlessly flies from center to top-left if logged in, stays if logging in) -->
    <div 
      class="absolute z-[110] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center {appLoaded && session ? 'top-4 left-6 w-10 h-10 translate-x-0 translate-y-0' : 'top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-0 pointer-events-none'}"
    >
      <img src="/Logo.png" alt="Ctrl+Savings Logo" class="w-full h-full object-contain" />
    </div>

    {#if appLoaded && !session}
      <AuthView {theme} />
    {:else if session}
      
      <!-- Top Mobile App Bar (With proper theme contrast) -->
      <TopBar
        {theme}
        onMenu={() => alert('Menu')}
        onNotifications={() => alert('Notifications')}
      />

      <!-- Scrollable Main Content with generous bottom padding so cards never get clipped by nav -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pb-36">

      {#if activeTab === 'home'}
        <!-- Screen 1 & 2: Budget Overview & Dashboard -->
        <main class="w-full flex flex-col gap-1 min-w-0 animate-in fade-in duration-150">

          <!-- Category Header: High-contrast white on dark, deep green on light (NO artificial DARK box!) -->
          <div class="px-6 pt-1 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-semibold tracking-tight block {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/70'}">
                Monthly Budget
              </span>
              <h2 class="text-2xl font-black tracking-tight leading-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                Groceries
              </h2>
            </div>
          </div>

          <!-- Hero Circular Gauge with High-Contrast dynamic track & arc -->
          <Gauge
            available={availableBudget}
            total={totalBudget}
            {theme}
          />

          <!-- Quick Action Buttons under Gauge (Screen 1) -->
          <div class="w-full px-12 py-2 flex items-center justify-between">
            <!-- Add Expense Button -->
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
                Add Expense
              </span>
            </button>

            <!-- Edit Budget Button -->
            <button
              onclick={() => {
                const newBudget = prompt('Set Monthly Budget ($):', totalBudget)
                if (newBudget && !isNaN(newBudget)) totalBudget = parseFloat(newBudget)
              }}
              class="cursor-pointer flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors {theme === 'dark' ? 'bg-emerald-500 text-black group-hover:bg-emerald-400' : 'bg-[#0a4733] text-white group-hover:bg-[#0d5940]'}">
                <svg class="w-5 h-5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <span class="text-xs font-bold tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                Edit Budget
              </span>
            </button>
          </div>

          <!-- Month-to-Month Spending Bar Chart (Screen 2) -->
          <SpendingChart
            {theme}
            onAnalysisClick={() => activeTab = 'savings'}
          />

          <!-- Transactions Section (Screen 1) -->
          <section class="w-full px-6 pt-2 pb-6 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-semibold block {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                  Transactions For
                </span>
                <h3 class="text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
                  May
                </h3>
              </div>
              <!-- Sort Button: properly themed -->
              <button class="cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border shadow-2xs transition-colors {theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'}">
                <span>Sort</span>
                <svg class="w-3 h-3 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <!-- Transaction Items List: The 3 cards with perfect high-contrast styling -->
            <div class="flex flex-col gap-2.5">
              {#each transactions as item}
                <div class="w-full border rounded-lg px-4 py-3.5 shadow-2xs flex items-center justify-between transition-colors {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200/90'}">
                  <div class="min-w-0">
                    <div class="text-sm font-extrabold tracking-tight truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                      {item.title}
                    </div>
                    <div class="text-[11px] font-mono {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
                      {item.date}
                    </div>
                  </div>
                  <div class="text-base font-black tracking-tight shrink-0 {theme === 'dark' ? 'text-[#4ade80]' : 'text-[#0a4733]'}">
                    ${item.amount.toFixed(2)}
                  </div>
                </div>
              {/each}
            </div>
          </section>

        </main>

      {:else if activeTab === 'savings'}
        <!-- Screen 4: Savings Synopsis -->
        <SavingsView
          {theme}
          onBack={() => activeTab = 'home'}
        />

      {:else if activeTab === 'profile'}
        <!-- Profile / Preferences Screen (Contains the clean theme toggle) -->
        <ProfileView
          {theme}
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
        onClose={() => isAddModalOpen = false}
        onAdd={handleAddExpense}
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
