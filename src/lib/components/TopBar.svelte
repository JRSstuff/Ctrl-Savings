<script>
  import AppIcon from './AppIcon.svelte'

  let {
    theme = 'light',
    onOpenSessions = () => {},
    activeSessionName = 'Current Cycle'
  } = $props()
</script>

<header class="w-full flex items-center justify-between px-6 pt-4 pb-2 z-20">
  <!-- Invisible placeholder to balance the 36px width of the Logo.png fixed at top-3.5 left-5 -->
  <div class="w-10 h-10 shrink-0"></div>

  <!-- Allowance Cycles Switcher Button -->
  <button
    type="button"
    onclick={onOpenSessions}
    aria-label="Allowance Cycles"
    class="cursor-pointer flex items-center gap-1.5 py-1.5 px-3 rounded-full border shadow-xs transition-all active:scale-95 {theme === 'dark' ? 'bg-[#18181b] border-zinc-700 hover:border-zinc-500 text-white' : 'bg-white border-zinc-300 hover:border-zinc-400 text-[#0a4733]'}"
    title="Allowance Cycles"
  >
    <AppIcon name="cycles" size={15} />
    <span class="text-xs font-black tracking-tight max-w-[130px] truncate">{activeSessionName || 'Cycle'}</span>
  </button>
</header>
