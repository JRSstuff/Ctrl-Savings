<script>
  let {
    activeTab = 'home',
    theme = 'light',
    onTabChange = () => {},
    onAddClick = () => {}
  } = $props()
</script>

<!-- Bottom Nav Container with Safe Area Handling -->
<nav class="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
  <!-- Pill Bar Container: Constrained max-width prevents awkward separation on wide screens -->
  <div class="pointer-events-auto relative w-full max-w-[420px] h-16 bg-[#042418] rounded-[2rem] flex items-center shadow-2xl border border-emerald-900/50">

    <!-- Mathematically perfectly aligned 5-column grid -->
    <div class="grid grid-cols-5 w-full h-full items-center">

      <!-- 1. Home -->
      <button
        onclick={() => onTabChange('home')}
        class="cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 {activeTab === 'home' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}"
      >
        <div class="w-6 h-6 flex items-center justify-center">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        <span class="text-[10px] font-bold tracking-tight leading-none">Home</span>
      </button>

      <!-- 2. Chatbot -->
      <button
        onclick={() => onTabChange('chatbot')}
        class="cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 {activeTab === 'chatbot' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}"
      >
        <div class="w-6 h-6 flex items-center justify-center">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 11v5a3 3 0 0 1-3 3h-1.1l-2.4 2.4a1 1 0 0 1-1.42 0L8.68 19H7a3 3 0 0 1-3-3v-5a7.002 7.002 0 0 1 6-6.93V3a1 1 0 0 1 1-1zm-3.5 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
          </svg>
        </div>
        <span class="text-[10px] font-bold tracking-tight leading-none">Chatbot</span>
      </button>

      <!-- 3. Plus Icon (Elevated above the bar, Dead Center) -->
      <div class="relative w-full h-full flex items-center justify-center">
        <button
          onclick={onAddClick}
          aria-label="Add Transaction"
          class="cursor-pointer absolute -top-4 w-14 h-14 rounded-full bg-[#0a4733] hover:bg-[#0d5940] active:scale-90 text-white flex items-center justify-center shadow-xl border-[4px] {theme === 'dark' ? 'border-[#09090b]' : 'border-[#f7f9f7]'} transition-transform duration-150 group"
        >
          <svg class="w-7 h-7 stroke-[3] group-hover:rotate-90 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <!-- 4. Profile -->
      <button
        onclick={() => onTabChange('profile')}
        class="cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 {activeTab === 'profile' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}"
      >
        <div class="w-6 h-6 flex items-center justify-center">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <span class="text-[10px] font-bold tracking-tight leading-none">Profile</span>
      </button>

      <!-- 5. Settings -->
      <button
        onclick={() => onTabChange('settings')}
        class="cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 {activeTab === 'settings' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}"
      >
        <div class="w-6 h-6 flex items-center justify-center">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </div>
        <span class="text-[10px] font-bold tracking-tight leading-none">Settings</span>
      </button>

    </div>
  </div>
</nav>
