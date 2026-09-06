<script>
  let { theme = 'light', onToggleTheme = () => {}, onBack = () => {} } = $props()
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
      <span class="text-[11px] font-semibold block {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/75'}">Account</span>
      <h2 class="text-xl font-extrabold tracking-tight leading-none {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
        Profile
      </h2>
    </div>
  </div>

  <!-- Profile Card -->
  <div class="w-full border rounded-xl p-4 shadow-xs flex items-center gap-3 mt-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}">
    <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
      B
    </div>
    <div class="flex-1 min-w-0">
      <h3 class="text-base font-bold truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Allowance User</h3>
      <p class="text-xs font-mono {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Monthly Budget: $980.00</p>
    </div>
  </div>

  <!-- Settings / System Status -->
  <div class="flex flex-col gap-2 pt-2">
    <span class="text-xs font-bold uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Preferences</span>

    <!-- Theme Toggle (Clean, inside Profile settings, not cluttering the header) -->
    <div class="w-full border rounded-lg p-3.5 flex items-center justify-between shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
      <div>
        <div class="text-sm font-bold {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Color Theme</div>
        <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Green+White or Green+Black</p>
      </div>
      <button
        onclick={onToggleTheme}
        aria-label="Toggle Theme"
        class="cursor-pointer p-2 rounded-full transition-all active:scale-95 {theme === 'dark' ? 'text-emerald-400 hover:bg-zinc-800' : 'text-[#0a4733] hover:bg-emerald-50'}"
      >
        {#if theme === 'light'}
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        {:else}
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        {/if}
      </button>
    </div>

    <!-- PWA / Offline Status -->
    <div class="w-full border rounded-lg p-3.5 flex items-center justify-between shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
      <div>
        <div class="text-sm font-bold {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Offline Caching</div>
        <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Workbox Service Worker Active</p>
      </div>
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-sm border {theme === 'dark' ? 'bg-black border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-600 text-emerald-800'}">
        PWA READY
      </span>
    </div>
  </div>
</div>
