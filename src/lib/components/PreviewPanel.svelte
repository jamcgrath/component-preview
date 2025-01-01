<script>
	/**
	 * @component PreviewPanel
	 * @description Right panel showing component preview and token usage
	 *
	 * @type {{
	 *   componentDisplay: string,          // HTML content to display
	 *   isLoading: boolean,               // Loading state
	 *   tokenUsage: object,               // Token usage stats
	 *   class?: string                    // Additional CSS classes
	 * }}
	 */
	let {
		componentDisplay = '',
		isLoading = false,
		tokenUsage = {},
		class: className = ''
	} = $props();
</script>

<div class={className}>
	<div class="sticky top-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-800">Component Preview</h2>
		<div class="min-h-[400px] rounded-lg border p-6">
			{#if isLoading}
				<div class="flex h-full items-center justify-center">
					<div class="flex flex-col items-center">
						<svg class="mb-4 h-10 w-10 animate-spin text-blue-600" viewBox="0 0 24 24">
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
						<p class="text-gray-500">Generating component...</p>
					</div>
				</div>
			{:else if componentDisplay}
				<div class="h-full">{@html componentDisplay}</div>
			{:else}
				<div class="flex h-full flex-col items-center justify-center text-gray-500">
					<svg
						class="mb-4 h-16 w-16 text-gray-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
						/>
					</svg>
					<p>Component preview will appear here</p>
					<p class="mt-1 text-sm text-gray-400">Generate a component to see the result</p>
				</div>
			{/if}
		</div>
		<div class="mt-1 text-sm text-gray-400">
			{#if tokenUsage}
				<ul class="mt-4 flex flex-wrap gap-2">
					{#each Object.entries(tokenUsage) as [key, value]}
						<li>{key.replace(/_/g, ' ')}: {value}</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
