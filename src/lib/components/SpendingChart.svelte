<script>
  let { theme = 'light', onAnalysisClick = () => {} } = $props()

  const months = [
    { label: 'DEC', height: 65 },
    { label: 'JAN', height: 85 },
    { label: 'FEB', height: 55 },
    { label: 'MAR', height: 95 },
    { label: 'APR', height: 88 },
    { label: 'MAY', height: 98 },
  ]
</script>

<div class="w-full px-6 py-2 flex flex-col gap-1.5">
  <!-- Section Title with Dropdown Chevron -->
  <div class="flex items-center justify-between">
    <div>
      <span class="text-[11px] font-semibold tracking-tight block {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/75'}">
        Month to Month
      </span>
      <button class="cursor-pointer flex items-center gap-1.5 text-lg font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'} hover:opacity-85">
        <span>Spending</span>
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  </div>

  <!-- Bar Chart Canvas -->
  <div class="relative w-full h-34 pt-3 pb-5 flex items-end">
    <!-- Left Y-Axis Guides -->
    <div class="absolute left-0 top-2 text-[10px] font-mono font-medium {theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}">1.2K</div>
    <div class="absolute left-0 top-14 text-[10px] font-mono font-medium {theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}">0.6K</div>
    
    <!-- Guide Lines -->
    <div class="absolute left-8 right-0 top-4 border-b border-dashed {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/60'}"></div>
    <div class="absolute left-8 right-0 top-16 border-b border-dashed {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/60'}"></div>

    <!-- Bars Container -->
    <div class="ml-8 w-full flex items-end justify-between h-full px-2">
      {#each months as month}
        <div class="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
          <div
            class="w-3.5 sm:w-4 rounded-full bg-gradient-to-t from-[#e11d48] to-[#fb7185] transition-all duration-300 group-hover:scale-y-105"
            style="height: {month.height}%;"
          ></div>
          <span class="text-[10px] font-bold transition-colors {theme === 'dark' ? 'text-zinc-400 group-hover:text-white' : 'text-zinc-500 group-hover:text-[#0a4733]'}">
            {month.label}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Spending Analysis Link -->
  <div class="w-full flex justify-end">
    <button
      onclick={onAnalysisClick}
      class="cursor-pointer text-xs font-bold hover:underline flex items-center gap-1 {theme === 'dark' ? 'text-[#4ade80]' : 'text-[#0a4733]'}"
    >
      <span>Spending Analysis</span>
      <span class="text-sm">»</span>
    </button>
  </div>
</div>
