<script>
  let {
    available = 0.00,
    total = 0.00,
    unit = '₱',
    theme = 'light',
    period = 'weekly',
    onTogglePeriod = () => {}
  } = $props()

  // Calculate percentage for circular progress
  let percentage = $derived(total === 0 ? 0 : Math.min(100, Math.max(0, (available / total) * 100)))
  
  // SVG circular gauge geometry
  const radius = 88
  const circumference = 2 * Math.PI * radius
  let strokeDashoffset = $derived(circumference - (percentage / 100) * circumference)

  // Format integer and decimal parts
  let formattedNumber = $derived(available.toFixed(2))
  let integerPart = $derived(formattedNumber.split('.')[0])
  let decimalPart = $derived(formattedNumber.split('.')[1])
  let formattedTotal = $derived(total.toFixed(2))
</script>

<div class="relative w-64 h-64 mx-auto flex items-center justify-center my-1">
  <!-- Circular SVG Gauge -->
  <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
    <!-- Background Track -->
    <circle
      cx="100"
      cy="100"
      r={radius}
      stroke={theme === 'dark' ? '#27272a' : '#e5ece7'}
      stroke-width="12"
      fill="transparent"
      class="transition-colors duration-300"
    />
    <!-- Active Progress Arc -->
    <circle
      cx="100"
      cy="100"
      r={radius}
      stroke={theme === 'dark' ? '#4ade80' : '#0a4733'}
      stroke-width="12"
      stroke-linecap="round"
      fill="transparent"
      stroke-dasharray={circumference}
      stroke-dashoffset={strokeDashoffset}
      class="transition-all duration-700 ease-out"
    />
  </svg>

  <!-- Center Text Content -->
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none px-4">

    <div class="flex items-baseline font-black tracking-tight leading-none {theme === 'dark' ? 'text-white' : 'text-[#0a4733]'}">
      <span class="text-2xl sm:text-3xl font-bold mr-0.5">{unit}</span>
      <span class="text-4xl sm:text-5xl">{integerPart}</span>
      <span class="text-xl sm:text-2xl font-bold">.{decimalPart}</span>
    </div>
    {#if total > 0}
      <p class="text-xs font-semibold mt-1.5 tracking-tight {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/85'}">
        available out of {unit}{formattedTotal}
      </p>
    {:else}
      <p class="text-xs font-semibold mt-1.5 tracking-tight {theme === 'dark' ? 'text-zinc-400' : 'text-[#0a4733]/85'}">
        Available Cash
      </p>
    {/if}
  </div>
</div>
