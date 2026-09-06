<script>
  let { theme = 'light', onBack = () => {} } = $props()

  const savingsGoals = [
    { month: 'February', amount: '$400.00', status: 'Goal Achieved' },
    { month: 'April', amount: '$650.00', status: 'Goal Achieved' },
    { month: 'May', amount: '$1,090.00', status: 'Goal Achieved' }
  ]
</script>

<div class="w-full flex flex-col gap-4 px-6 pb-24 animate-in fade-in duration-200">
  <!-- Top Navigation Header -->
  <div class="flex items-center gap-2 pt-2">
    <button
      onclick={onBack}
      aria-label="Back to Home"
      class="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all {theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-emerald-950/10 text-[#0a4733] hover:bg-emerald-950/20'}"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <div>
      <span class="text-[11px] font-semibold block {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/75'}">
        All-Time
      </span>
      <h2 class="text-xl font-extrabold tracking-tight leading-none {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
        Savings Synopsis
      </h2>
    </div>
  </div>

  <!-- Total Savings to Date matching Screen 4 -->
  <div class="pt-4 pb-2">
    <span class="text-xs font-semibold block {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Total</span>
    <h3 class="text-sm font-bold tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Savings to Date</h3>
    <div class="text-4xl sm:text-5xl font-black tracking-tight mt-1 {theme === 'dark' ? 'text-[#4ade80]' : 'text-[#0a4733]'}">
      $2,140<span class="text-2xl sm:text-3xl font-bold">.00</span>
    </div>
  </div>

  <!-- Savings Snapshot with Filter -->
  <div class="pt-2 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div>
        <span class="text-[10px] font-bold uppercase text-zinc-400 block">Savings</span>
        <h4 class="text-base font-extrabold {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">Snapshot</h4>
      </div>
      <button class="cursor-pointer flex items-center gap-1 text-xs font-medium border rounded-md px-2 py-1 {theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-700'}">
        <span>Filter: Goal Achieved</span>
        <svg class="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Goals List -->
    <div class="flex flex-col gap-2.5">
      {#each savingsGoals as goal}
        <div class="w-full border rounded-lg p-3.5 shadow-xs flex flex-col gap-1.5 {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200/80'}">
          <!-- Goal Achieved Badge -->
          <div class="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#d97706]/20 text-[#f59e0b] text-[10px] font-bold">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{goal.status}</span>
          </div>
          <!-- Month and Amount -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-sm font-bold {theme === 'dark' ? 'text-white' : 'text-zinc-800'}">{goal.month}</span>
            <span class="text-base font-extrabold {theme === 'dark' ? 'text-[#4ade80]' : 'text-[#0a4733]'}">{goal.amount}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
