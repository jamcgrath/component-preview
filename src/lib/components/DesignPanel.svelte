/**
 * @component DesignPanel
 * @description Left panel containing design input and history sections
 *
 * @type {{
 *   prompt: string,                     // Current prompt value
 *   history: Array<object>,             // Component history
 *   currentIndex: number,               // Current history index
 *   imagePreview: string|null,          // Current image preview
 *   isLoading: boolean,                 // Loading state
 *   error: string|null,                 // Error message
 *   onsubmit: () => void,              // Submit handler
 *   onundo: () => void,                // Undo handler
 *   onredo: () => void,                // Redo handler
 *   onshowassets: () => void,          // Show assets handler
 *   onexport: () => void,              // Export history
 *   onimport: (file: File) => void,    // Import history
 *   onclear: () => void,               // Clear history
 *   class?: string                     // Additional CSS classes
 * }}
 */
<script>
  let {
    prompt = $state(''),
    history = [],
    currentIndex = -1,
    imagePreview = null,
    isLoading = false,
    error = null,
    onsubmit = () => {},
    onundo = () => {},
    onredo = () => {},
    onshowassets = () => {},
    onexport = () => {},
    onimport = () => {},
    onclear = () => {},
    class: className = ''
  } = $props();

  // Image handling functions
  function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('bg-gray-100');
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('bg-gray-100');
  }

  function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('bg-gray-100');
    const file = event.dataTransfer?.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(event) {
    const file = event.target?.files[0];
    if (file) handleFile(file);
  }
</script>

<div class="flex flex-col gap-6 {className}">
  <!-- Design Input Section -->
  <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h2 class="mb-4 text-xl font-semibold text-gray-800">Design Input</h2>

    {#if error}
      <div class="mb-4 rounded border-l-4 border-red-400 bg-red-50 p-4" role="alert">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Image Upload Area -->
    <div class="mb-6">
      <label for="reference-image" class="mb-2 block text-sm font-medium text-gray-700"
        >Reference Image</label
      >
      <div
        class="rounded-lg border-2 border-gray-200 bg-gray-50 {imagePreview
          ? ''
          : 'border-dashed'}"
      >
        {#if imagePreview}
          <div class="group relative">
            <img
              src={imagePreview}
              alt="Reference"
              class="h-48 w-full rounded-lg object-contain"
            />
            <button
              onclick={removeImage}
              class="absolute right-2 top-2 rounded-full bg-white/90 p-1 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
              aria-label="Remove image"
            >
              <svg
                class="h-5 w-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        {:else}
          <label
            class="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:bg-gray-100"
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
          >
            <div class="flex flex-col items-center justify-center pb-6 pt-5">
              <svg
                class="mb-3 h-10 w-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="text-sm text-gray-500">Drop your image here or click to upload</p>
              <p class="mt-1 text-xs text-gray-400">PNG, JPG, SVG</p>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              id="reference-image"
              onchange={handleFileInput}
              class="hidden"
              disabled={isLoading}
            />
          </label>
        {/if}
      </div>
    </div>

    <div class="mb-2 flex items-center justify-between">
      <button
        onclick={onshowassets}
        class="text-sm text-blue-600 hover:text-blue-700"
      >
        Browse Assets
      </button>
    </div>

    <!-- Text Input Area -->
    <div class="mb-6">
      <label for="component-description" class="mb-2 block text-sm font-medium text-gray-700"
        >Component Description</label
      >
      <textarea
        id="component-description"
        bind:value={prompt}
        class="h-32 w-full resize-none rounded-lg border border-gray-300 bg-white p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        placeholder="Describe the component you want to create..."
        disabled={isLoading}
      ></textarea>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap gap-3">
      <button
        onclick={onsubmit}
        class="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || !prompt.trim()}
      >
        {#if isLoading}
          <svg class="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        {/if}
        {isLoading ? 'Generating...' : 'Generate Component'}
      </button>

      <div class="flex gap-2">
        <button
          onclick={onundo}
          disabled={currentIndex <= 0 || isLoading}
          class="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title="Undo"
          aria-label="Undo"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h10a4 4 0 0 1 4 4v2m-6-6l-3-3m0 0L5 4m3 3H3"
            />
          </svg>
        </button>
        <button
          onclick={onredo}
          disabled={currentIndex >= history.length - 1 || isLoading}
          class="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title="Redo"
          aria-label="Redo"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 10h-10a4 4 0 0 0-4 4v2m6-6l3-3m0 0l3 3m-3-3v6"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- History Section -->
  <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800">History</h2>
      <div class="flex gap-2">
        <button
          onclick={onexport}
          disabled={history.length === 0}
          class="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export
        </button>
        <label
          class="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
        >
          Import
          <input
            type="file"
            accept=".json"
            onchange={onimport}
            class="hidden"
            disabled={isLoading}
          />
        </label>
        <button
          onclick={onclear}
          disabled={history.length === 0 || isLoading}
          class="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="max-h-96 divide-y overflow-y-auto rounded-lg border">
      {#if history.length === 0}
        <div class="p-8 text-center text-gray-500">
          <svg
            class="mx-auto mb-3 h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <p>No history yet</p>
          <p class="mt-1 text-sm text-gray-400">Generated components will appear here</p>
        </div>
      {:else}
        {#each history as item, i}
          <button
            class="w-full p-4 text-left hover:bg-gray-50 {i === currentIndex
              ? 'bg-blue-50'
              : ''} flex items-start gap-4 transition-colors"
            onclick={() => loadHistoryItem(i)}
            disabled={isLoading}
          >
            {#if item.referenceImage}
              <img
                src={item.referenceImage}
                alt="Reference thumbnail"
                class="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
            {/if}
            <div class="min-w-0 flex-grow">
              <p class="truncate font-medium text-gray-900">{item.prompt}</p>
              <p class="mt-1 text-sm text-gray-500">
                {item.timestamp.toLocaleString()}
              </p>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>
