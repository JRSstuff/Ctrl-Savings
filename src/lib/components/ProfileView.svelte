<script>
  import { fade, slide } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  let { theme = 'light', session = null, onToggleTheme = () => {}, onBack = () => {} } = $props()

  let firstName = $state(localStorage.getItem('allowance_firstname') || 'User')
  let lastName = $state(localStorage.getItem('allowance_lastname') || '')
  let middleName = $state(localStorage.getItem('allowance_middlename') || '')
  let dob = $state(localStorage.getItem('allowance_dob') || 'Not Set')
  let initials = $state('U')
  let profileError = $state('')
  let loading = $state(false)
  
  let showCreditsModal = $state(false)

  async function loadProfile() {
    const uid = session || localStorage.getItem('allowance_user_id')
    if (!uid || uid === 'undefined' || uid === 'null') {
      profileError = 'Session is invalid or missing user ID. Please sign out and log in again.'
      return
    }

    loading = true
    profileError = ''

    try {
      const res = await fetch('/api/user', {
        headers: { 'x-user-id': uid }
      })
      const result = await res.json()
      if (!res.ok) {
        profileError = result.error || 'Failed to retrieve profile information.'
      } else if (result.data) {
        firstName = result.data.first_name || result.data.username || 'User'
        lastName = result.data.last_name || ''
        middleName = result.data.middle_name || ''
        dob = result.data.date_of_birth || 'Not Set'

        localStorage.setItem('allowance_firstname', firstName)
        localStorage.setItem('allowance_lastname', lastName)
        localStorage.setItem('allowance_middlename', middleName)
        localStorage.setItem('allowance_dob', dob)
      }
    } catch (err) {
      profileError = err.message || 'Network error fetching user profile.'
    } finally {
      loading = false
      initials = ((firstName ? firstName.charAt(0) : 'U') + (lastName ? lastName.charAt(0) : '')).toUpperCase()
    }
  }

  let isClearingCache = $state(false)
  let clearSuccess = $state(false)

  async function handleClearHardCache() {
    if (isClearingCache) return
    isClearingCache = true
    try {
      // 1. Delete all service worker caches (CacheStorage)
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.map(key => caches.delete(key)))
      }

      // 2. Unregister all service workers
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
      }

      // 3. Clear session and local storage
      sessionStorage.clear()
      localStorage.clear()

      clearSuccess = true

      // 4. Force a hard reload from network, busting cache
      setTimeout(() => {
        const cleanUrl = window.location.origin + window.location.pathname + '?fresh=' + Date.now()
        window.location.replace(cleanUrl)
      }, 500)
    } catch (err) {
      console.error('Failed to clear hard cache:', err)
      localStorage.clear()
      sessionStorage.clear()
      window.location.reload()
    }
  }

  $effect(() => {
    loadProfile()
  })
</script>

<div class="w-full flex flex-col gap-4 px-6 pb-24 animate-in fade-in duration-200">
  <!-- Top Navigation Header -->
  <div class="flex items-center justify-between pt-2">
    <div class="flex items-center gap-2">
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
    
    <!-- Credits / Info Button -->
    <button
      onclick={() => showCreditsModal = true}
      aria-label="About this app"
      class="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all {theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'}"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </button>
  </div>

  {#if profileError}
    <div class="w-full p-3 rounded-lg border bg-red-500/10 border-red-500/40 text-red-500 text-xs font-semibold flex items-center justify-between gap-2 mt-1">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{profileError}</span>
      </div>
      <button 
        onclick={loadProfile}
        class="underline font-bold hover:opacity-80 shrink-0 cursor-pointer"
      >
        Retry
      </button>
    </div>
  {/if}

  <!-- Real User Profile Card -->
  <div class="w-full border rounded-xl p-4 shadow-xs flex items-center gap-3.5 mt-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}">
    <div class="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shrink-0 {theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-[#0a4733] text-white'}">
      {initials}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <h3 class="text-lg font-black tracking-tight truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
          {firstName} {middleName ? middleName.charAt(0) + '.' : ''} {lastName}
        </h3>
      </div>
      <p class="text-xs font-semibold {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">Allowance Account</p>
      <p class="text-[11px] font-mono mt-0.5 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">DOB: {dob}</p>
    </div>
  </div>

  <!-- Settings / System Status -->
  <div class="flex flex-col gap-2 pt-2">
    <span class="text-xs font-bold uppercase tracking-wider {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">Preferences</span>

    <!-- Theme Toggle -->
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

    <!-- Hard Cache & App Update Reset -->
    <div class="w-full border rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs {theme === 'dark' ? 'bg-[#121215] border-zinc-800' : 'bg-white border-zinc-200'}">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Clear Hard Cache</span>
          {#if clearSuccess}
            <span class="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              PURGED
            </span>
          {/if}
        </div>
        <p class="text-xs {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
          Purges service worker cache, updates, and reloads freshly
        </p>
      </div>
      <button
        type="button"
        onclick={handleClearHardCache}
        disabled={isClearingCache}
        class="cursor-pointer text-xs font-black px-3.5 py-2 rounded-lg border transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5 {theme === 'dark' ? 'bg-zinc-800/90 border-zinc-700 text-emerald-400 hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-300 text-[#0a4733] hover:bg-zinc-100'}"
        title="Clear all caches, unregister service workers, and refresh"
      >
        <svg class="w-3.5 h-3.5 {isClearingCache ? 'animate-spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
        <span>{isClearingCache ? 'Purging Cache...' : (clearSuccess ? 'Reloading...' : 'Clear Hard Cache')}</span>
      </button>
    </div>

    <!-- Sign Out Button -->
    <button
      onclick={() => {
        localStorage.clear(); // Clear all saved info completely on sign out
        window.location.reload();
      }}
      class="w-full mt-4 border rounded-lg p-3.5 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer {theme === 'dark' ? 'bg-[#121215] border-red-900/50 text-red-500 hover:bg-red-950/30' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'}"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span class="text-sm font-bold">Sign Out</span>
    </button>
  </div>
</div>

<!-- Credits Modal -->
{#if showCreditsModal}
  <div 
    class="fixed inset-0 z-[200] flex items-center justify-center px-4"
    transition:fade={{ duration: 200, easing: cubicOut }}
  >
    <!-- Backdrop -->
    <button 
      type="button"
      aria-label="Close modal backdrop"
      class="absolute inset-0 w-full h-full cursor-default bg-black/60 backdrop-blur-sm border-none"
      onclick={() => showCreditsModal = false}
    ></button>

    <!-- Modal Content -->
    <div 
      class="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto {theme === 'dark' ? 'bg-[#121215] border border-zinc-800' : 'bg-white border border-zinc-200'}"
      transition:slide={{ duration: 250, axis: 'y' }}
    >
      <div class="flex items-center justify-between border-b pb-2.5 {theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}">
        <div class="flex items-center gap-2">
          <span class="text-base">👥</span>
          <h2 class="text-base font-black tracking-tight {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">Project Team & Credits</h2>
        </div>
        <button 
          type="button"
          aria-label="Close"
          onclick={() => showCreditsModal = false}
          class="p-1 rounded-full cursor-pointer {theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      
      <!-- Project Team Members -->
      <div class="flex flex-col gap-2">
        {#each [
          { role: 'Problem & Design Analyst', name: 'Shawn Hitalada', handle: '@Shawn Hitalada', icon: '🎨' },
          { role: 'Main Programmer', name: 'Justine Salvador', handle: '@Justine Salvador', icon: '💻' },
          { role: 'Tester & Debugger', name: 'John Kurt Montero', handle: '@John Kurt Montero', icon: '🧪' },
          { role: 'Operator & Presenter', name: 'Mark Bacus', handle: '@Mark Bacus', icon: '🎙️' },
          { role: 'Project Leader', name: 'Danlord Farell A. Soriano', handle: '@Danlord Farell A. Soriano', icon: '👑' }
        ] as member}
          <div class="p-2 rounded-xl border flex items-center justify-between gap-2 {theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm shrink-0">{member.icon}</span>
              <div class="min-w-0">
                <span class="text-[9px] font-bold uppercase tracking-wider block {theme === 'dark' ? 'text-emerald-400' : 'text-[#0a4733]'}">
                  {member.role}
                </span>
                <p class="text-xs font-black truncate {theme === 'dark' ? 'text-white' : 'text-zinc-900'}">
                  {member.name}
                </p>
              </div>
            </div>
            <span class="text-[10px] font-mono font-medium shrink-0 px-1.5 py-0.5 rounded border {theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}">
              {member.handle}
            </span>
          </div>
        {/each}
      </div>

      <!-- Academic Project Badge -->
      <div class="w-full rounded-xl p-3 flex flex-col gap-1 {theme === 'dark' ? 'bg-emerald-950/20 border border-emerald-900/50' : 'bg-emerald-50/70 border border-emerald-200/60'}">
        <span class="text-[10px] font-bold uppercase tracking-wider {theme === 'dark' ? 'text-emerald-500' : 'text-[#0a4733]/80'}">Project-Based Learning (PBL)</span>
        <p class="text-[11px] leading-snug {theme === 'dark' ? 'text-zinc-300' : 'text-[#0a4733]'}">
          Developed for <strong>CS111: Introduction to Computing (Prelims)</strong> at the University of Science and Technology of Southern Philippines (USTP).
        </p>
      </div>
    </div>
  </div>
{/if}
