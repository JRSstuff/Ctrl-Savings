<script>
  let { isOpen = false, onClose = () => {}, onAdd = () => {} } = $props()

  let amount = $state('')
  let title = $state('')
  let category = $state('Groceries')

  const categories = ['Groceries', 'Dining', 'Bills', 'Savings', 'Other']

  function handleSubmit(e) {
    e.preventDefault()
    if (!amount) return
    onAdd({
      title: title.trim() || category,
      amount: parseFloat(amount),
      date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
      category
    })
    amount = ''
    title = ''
    onClose()
  }

  function handleBackdropKey(e) {
    if (e.key === 'Escape') onClose()
  }
</script>

<svelte:window onkeydown={handleBackdropKey} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Add Expense Modal"
    tabindex="-1"
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
  >
    <!-- Background overlay for clicking to close -->
    <button
      type="button"
      aria-label="Close modal"
      onclick={onClose}
      class="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
    ></button>

    <!-- Modal Bottom Sheet -->
    <div
      class="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-zinc-200 flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-200"
    >
      <div class="flex items-center justify-between border-b pb-3">
        <h3 class="text-lg font-bold text-[#0a4733]">Add Expense</h3>
        <button
          type="button"
          aria-label="Close modal"
          onclick={onClose}
          class="cursor-pointer text-zinc-400 hover:text-zinc-700 p-1 text-xl leading-none"
        >
          ✕
        </button>
      </div>

      <form onsubmit={handleSubmit} class="flex flex-col gap-3.5">
        <div>
          <label for="expense-amount" class="text-xs font-bold text-zinc-500 block mb-1">Amount ($)</label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            bind:value={amount}
            required
            class="w-full border border-zinc-300 rounded-lg p-3 text-2xl font-black text-[#0a4733] focus:outline-none focus:border-[#0a4733] focus:ring-1 focus:ring-[#0a4733]"
          />
        </div>

        <div>
          <label for="expense-note" class="text-xs font-bold text-zinc-500 block mb-1">Description</label>
          <input
            id="expense-note"
            type="text"
            placeholder="e.g. Safeway, Coffee"
            bind:value={title}
            class="w-full border border-zinc-300 rounded-lg p-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#0a4733]"
          />
        </div>

        <div>
          <span class="text-xs font-bold text-zinc-500 block mb-1.5">Category</span>
          <div class="flex flex-wrap gap-2">
            {#each categories as cat}
              <button
                type="button"
                onclick={() => category = cat}
                class="cursor-pointer px-3 py-1 text-xs font-semibold rounded-full border transition-all {category === cat ? 'bg-[#0a4733] text-white border-[#0a4733]' : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'}"
              >
                {cat}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            onclick={onClose}
            class="cursor-pointer flex-1 py-2.5 text-xs font-bold rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="cursor-pointer flex-1 py-2.5 text-xs font-bold rounded-lg bg-[#0a4733] hover:bg-[#0c5940] active:scale-98 text-white shadow-md"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
