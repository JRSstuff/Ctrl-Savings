<script>
  let { theme = 'light', onMenu = () => {}, onNotifications = () => {} } = $props()
</script>

<header class="w-full flex items-center justify-between px-6 pt-4 pb-2">
  <!-- Invisible placeholder for the Logo which is now globally animated in App.svelte -->
  <div class="w-10 h-10"></div>

  <!-- Notification Bell with Alert Dot -->
  <button
    onclick={onNotifications}
    aria-label="Notifications"
    class="cursor-pointer relative p-1.5 -mr-1.5 rounded-md transition-all active:scale-95 {theme === 'dark' ? 'text-white hover:bg-zinc-800' : 'text-[#0a4733] hover:bg-emerald-900/10'}"
  >
    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
    <!-- Notification indicator badge -->
    <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22c55e] ring-2 {theme === 'dark' ? 'ring-[#09090b]' : 'ring-white'}"></span>
  </button>
</header>
