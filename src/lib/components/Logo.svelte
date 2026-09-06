<script>
  let { theme = 'light', size = 'sm' } = $props();
  
  let sizeClasses = $derived(
    size === 'lg' ? 'w-24 h-24' : 'w-10 h-10'
  );
</script>

<div class="flex items-center">
  <!-- The Main Logo Thing -->
  <div class="{sizeClasses} overflow-hidden flex items-center justify-center rounded-xl bg-transparent">
    <!-- Using the user's provided Logo.png with true transparency -->
    <img 
      src="/Logo.png" 
      alt="Ctrl+Savings Logo" 
      class="w-full h-full object-contain" 
    />
  </div>
</div>
