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
        <!-- Placeholder for the newly requested Settings tab -->
        <div class="w-full flex flex-col items-center justify-center p-12 text-center h-full">
          <div class="w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-4 {theme === 'dark' ? 'bg-[#121215] text-zinc-400' : 'bg-white text-zinc-400'}">
            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
            </svg>
          </div>
          <h3 class="text-xl font-bold {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Settings</h3>
          <p class="text-sm mt-2 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Settings dashboard coming soon.</p>
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
