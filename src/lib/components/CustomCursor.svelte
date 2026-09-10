<!-- lib/components/CustomCursor.svelte -->
<script>
  import { onMount } from 'svelte'

  let { theme = 'light' } = $props()

  let cursorX = $state(-100)
  let cursorY = $state(-100)
  let trailingX = $state(-100)
  let trailingY = $state(-100)
  let isHovered = $state(false)
  let isClicking = $state(false)
  let isTouchDevice = $state(false)

  onMount(() => {
    // Detect mobile/touchscreen to disable custom cursor hardware overlap
    if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) {
      isTouchDevice = true
      return
    }

    const handleMouseMove = (e) => {
      cursorX = e.clientX
      cursorY = e.clientY
    }

    const handleMouseDown = () => (isClicking = true)
    const handleMouseUp = () => (isClicking = false)

    // Check if target is interactive (button, link, input)
    const handleMouseOver = (e) => {
      const target = e.target
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[role="button"]') ||
        target.closest('.cursor-pointer')
      ) {
        isHovered = true
      } else {
        isHovered = false
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseover', handleMouseOver)

    // Smooth trailing animation frame (Lerp loop)
    let animationFrameId
    const loop = () => {
      trailingX += (cursorX - trailingX) * 0.18
      trailingY += (cursorY - trailingY) * 0.18
      animationFrameId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseover', handleMouseOver)
      cancelAnimationFrame(animationFrameId)
    }
  })
</script>

{#if !isTouchDevice}
  <!-- Precision Dot -->
  <div
    class="fixed top-0 left-0 w-2.5 h-2.5 rounded-full pointer-events-none z-[9999] transition-transform duration-75 -translate-x-1/2 -translate-y-1/2 {theme === 'dark' ? 'bg-emerald-400' : 'bg-[#0a4733]'}"
    style="transform: translate3d({cursorX}px, {cursorY}px, 0) scale({isClicking ? 0.7 : isHovered ? 1.5 : 1});"
  ></div>

  <!-- Trailing Magnetic Ring -->
  <div
    class="fixed top-0 left-0 w-8 h-8 rounded-full border pointer-events-none z-[9998] transition-all duration-300 ease-out -translate-x-1/2 -translate-y-1/2 {isHovered ? (theme === 'dark' ? 'scale-150 bg-emerald-500/10 border-emerald-400/80' : 'scale-150 bg-emerald-900/10 border-[#0a4733]') : (theme === 'dark' ? 'border-emerald-400/30' : 'border-[#0a4733]/30')}"
    style="transform: translate3d({trailingX}px, {trailingY}px, 0) scale({isClicking ? 0.8 : isHovered ? 1.6 : 1});"
  ></div>
{/if}

<style>
  /* Hide standard cursor on desktop when using custom cursor */
  @media (pointer: fine) {
    :global(html),
    :global(html button),
    :global(html a),
    :global(html input) {
      cursor: none !important;
    }
  }
</style>
