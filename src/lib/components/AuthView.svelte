<script>
  let { theme = 'light', onSuccess } = $props()
  
  let mode = $state('login') // 'login' or 'register'
  
  let username = $state('')
  let password = $state('')
  let confirmPassword = $state('')
  
  // New Registration Fields
  let firstName = $state('')
  let middleName = $state('')
  let lastName = $state('')
  let dateOfBirth = $state('')

  let loading = $state(false)
  let errorMessage = $state('')

  async function handleSubmit(e) {
    e.preventDefault()
    errorMessage = ''
    
    if (!username || !password) {
      errorMessage = 'Please enter both username and password.'
      return
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        errorMessage = 'Passwords do not match.'
        return
      }
      if (!firstName || !lastName || !dateOfBirth) {
        errorMessage = 'First name, last name, and date of birth are required.'
        return
      }
    }

    loading = true

    if (mode === 'register') {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            password,
            firstName,
            middleName,
            lastName,
            dateOfBirth
          })
        })
        
        let result
        try {
          result = await res.json()
        } catch (e) {
          throw new Error('Server returned an invalid response. API might be offline.')
        }
        
        if (!res.ok) {
          if (result.error && result.error.includes('duplicate key')) {
            errorMessage = 'Username already exists.'
          } else {
            errorMessage = result.error || 'Registration failed.'
          }
        } else if (result.data) {
          const user = typeof result.data === 'object' && result.data !== null ? result.data : { id: result.data }
          const uid = user.id || result.data
          localStorage.setItem('allowance_user_id', uid)
          localStorage.setItem('allowance_username', user.username || username)
          localStorage.setItem('allowance_firstname', user.first_name || firstName)
          localStorage.setItem('allowance_lastname', user.last_name || lastName)
          localStorage.setItem('allowance_middlename', user.middle_name || middleName)
          localStorage.setItem('allowance_dob', user.date_of_birth || dateOfBirth)
          if (onSuccess) onSuccess(user.first_name || firstName)
          else window.location.reload()
        }
      } catch (err) {
        errorMessage = err.message || 'Network error occurred.'
      }
    } else {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
        
        let result
        try {
          result = await res.json()
        } catch (e) {
          throw new Error('Server returned an invalid response. API might be offline.')
        }
        
        if (!res.ok) {
          errorMessage = result.error || 'Login failed.'
        } else if (!result.data) {
          errorMessage = 'Invalid username or password.'
        } else {
          const user = typeof result.data === 'object' && result.data !== null ? result.data : { id: result.data }
          const uid = user.id || result.data
          localStorage.setItem('allowance_user_id', uid)
          localStorage.setItem('allowance_username', user.username || username)
          localStorage.setItem('allowance_firstname', user.first_name || '')
          localStorage.setItem('allowance_lastname', user.last_name || '')
          localStorage.setItem('allowance_middlename', user.middle_name || '')
          localStorage.setItem('allowance_dob', user.date_of_birth || '')
          if (onSuccess) onSuccess(user.first_name || user.username || username)
          else window.location.reload()
        }
      } catch (err) {
        errorMessage = err.message || 'Network error occurred.'
      }
    }

    loading = false
  }
</script>

<div class="w-full h-full flex flex-col justify-center px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <div class="w-full max-w-sm mx-auto flex flex-col gap-8">
    
    <!-- Header -->
    <div class="flex flex-col items-center text-center gap-2">
      <div class="w-16 h-16 rounded-2xl overflow-hidden mb-2 {theme === 'dark' ? 'bg-white' : 'bg-transparent'}">
        <img src="/Logo.png" alt="Logo" class="w-full h-full object-contain mix-blend-multiply {theme === 'dark' ? 'invert' : ''}" />
      </div>
      <h1 class="text-3xl font-black tracking-tighter {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
        {mode === 'login' ? 'Log in' : 'Create Account'}
      </h1>
      <p class="text-xs font-medium leading-relaxed px-4 {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
        {mode === 'login' 
          ? 'Enter your username and password to securely access your tracker.' 
          : 'Create a new account to get started and manage your allowance offline.'}
      </p>
    </div>

    <!-- Form -->
    <form onsubmit={handleSubmit} class="flex flex-col gap-4 w-full">
      
      <!-- Username Input -->
      <div class="relative w-full">
        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <input 
          type="text" 
          bind:value={username}
          placeholder="Username" 
          required
          class="w-full pl-12 pr-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
        />
      </div>

      {#if mode === 'register'}
        <!-- Name Inputs Group -->
        <div class="flex gap-2 w-full animate-in slide-in-from-top-2">
          <input 
            type="text" 
            bind:value={firstName}
            placeholder="First Name" 
            required
            class="w-full px-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
          />
          <input 
            type="text" 
            bind:value={middleName}
            placeholder="Middle" 
            class="w-2/3 px-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
          />
        </div>
        <div class="w-full animate-in slide-in-from-top-2">
          <input 
            type="text" 
            bind:value={lastName}
            placeholder="Last Name" 
            required
            class="w-full px-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
          />
        </div>
        
        <!-- Date of Birth Input -->
        <div class="w-full animate-in slide-in-from-top-2">
          <input 
            type="date" 
            bind:value={dateOfBirth}
            required
            class="w-full px-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
          />
        </div>
      {/if}

      <!-- Password Input -->
      <div class="relative w-full">
        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <input 
          type="password" 
          bind:value={password}
          placeholder="Password" 
          required
          class="w-full pl-12 pr-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
        />
      </div>

      {#if mode === 'register'}
        <!-- Confirm Password Input -->
        <div class="relative w-full animate-in slide-in-from-top-2">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <input 
            type="password" 
            bind:value={confirmPassword}
            placeholder="Confirm Password" 
            required
            class="w-full pl-12 pr-4 py-4 rounded-xl text-sm font-bold border transition-all outline-none focus:ring-2 {theme === 'dark' ? 'bg-[#121215] border-zinc-800 text-white focus:ring-emerald-500/50' : 'bg-white border-zinc-200 text-zinc-900 focus:ring-[#0a4733]/20'}"
          />
        </div>
      {/if}

      <!-- Error Message -->
      {#if errorMessage}
        <div class="w-full py-2 px-3 rounded-lg text-xs font-bold text-center border {errorMessage.includes('successful') ? (theme === 'dark' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800') : (theme === 'dark' ? 'bg-red-950 border-red-500 text-red-400' : 'bg-red-50 border-red-300 text-red-800')}">
          {errorMessage}
        </div>
      {/if}

      <!-- Submit Button -->
      <button 
        type="submit" 
        disabled={loading}
        class="w-full mt-2 py-4 rounded-full font-black text-sm transition-all active:scale-95 shadow-lg disabled:opacity-50 {theme === 'dark' ? 'bg-emerald-500 text-black shadow-emerald-500/20 hover:bg-emerald-400' : 'bg-[#22c55e] text-white shadow-[#22c55e]/30 hover:bg-[#1ea951]'}"
      >
        {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Create Account')}
      </button>
    </form>

    <!-- Toggle Mode -->
    <div class="w-full text-center pt-2">
      <span class="text-xs font-semibold {theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}">
        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
      </span>
      <button 
        type="button"
        onclick={() => { mode = mode === 'login' ? 'register' : 'login'; errorMessage = '' }}
        class="text-xs font-black ml-1 cursor-pointer hover:underline transition-colors {theme === 'dark' ? 'text-emerald-400' : 'text-[#22c55e]'}"
      >
        {mode === 'login' ? 'Sign Up here' : 'Sign In here'}
      </button>
    </div>

  </div>
</div>
