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

  // Application State
  let appLoaded = $state(false)
  let activeTab = $state('home') // 'home', 'savings', 'profile', 'settings'
  let theme = $state('light') // Default to clean light theme matching the reference design
  let isAddModalOpen = $state(false)

  // Trigger splash screen hero animation after a cool loading duration
  $effect(() => {
    const timer = setTimeout(() => {
      appLoaded = true
    }, 1800)
    return () => clearTimeout(timer)
  })

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
    
    <!-- Hero Animated Logo (Seamlessly flies from center to top-left) -->
    <div 
      class="absolute z-[110] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center {appLoaded ? 'top-4 left-6 w-10 h-10 translate-x-0 translate-y-0' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48'}"
    >
      <img src="/Logo.png" alt="Ctrl+Savings Logo" class="w-full h-full object-contain" />
    </div>
    
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

          <!-- App details -->
          <div class="w-full border rounded-lg p-3.5 flex items-center justify-between {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}">
            <div>
              <div class="text-xs font-bold">Ctrl+Savings App</div>
              <p class="text-[11px] {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Version 1.0.0 (Prelim Release)</p>
            </div>
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border {theme === 'dark' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-[#0a4733]'}">
              PBL PASSED
            </span>
          </div>
        </div>
      {/if}

    </div>

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

  </div>
</div>
