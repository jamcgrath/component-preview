<script>
	/**
	 * @component AssetManagerModal
	 * @description Modal for managing uploaded assets
	 *
	 * @type {{
	 *   show: boolean,                     // Show/hide modal
	 *   assets: Array<object>,             // List of assets
	 *   onclose: () => void,              // Close modal handler
	 *   ondelete: (id: string) => void,   // Delete asset handler
	 *   onupload: (file: File) => void,   // Upload asset handler
	 *   class?: string                    // Additional CSS classes
	 * }}
	 */
	let {
		show = false,
		assets = [],
		onclose = () => {},
		ondelete = () => {},
		onupload = () => {},
		class: className = ''
	} = $props();
</script>

{#if show}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
		<div class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-semibold">Asset Manager</h2>
				<button
					onclick={onclose}
					class="rounded-lg p-2 hover:bg-gray-100"
					aria-label="Close asset manager"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="flex-grow overflow-auto">
				{#if assets.length === 0}
					<div class="py-8 text-center">
						<p class="text-gray-500">No assets uploaded yet</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
						{#each assets as asset}
							<div class="relative overflow-hidden rounded-lg bg-gray-100">
								<div class="relative aspect-square">
									<img
										src={asset.url}
										alt={asset.name}
										class="absolute inset-0 h-full w-full object-cover"
									/>
									<button
										onclick={(e) => {
											e.stopPropagation();
											ondelete(asset.id);
										}}
										class="absolute right-2 top-2 rounded-full bg-white p-2 shadow-sm hover:bg-gray-50"
										aria-label="Delete asset"
									>
										<svg
											class="h-5 w-5 text-red-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
								<div class="p-3">
									<p class="truncate font-medium">{asset.name}</p>
									<p class="mt-1 text-sm text-gray-500">ID: {asset.id}</p>
									<button
										class="mt-3 w-full rounded-lg bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700"
										onclick={() => {
											navigator.clipboard.writeText(asset.id);
										}}
									>
										Copy Asset ID
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-6">
				<label class="block w-full">
					<div
						class="flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700"
					>
						<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						Upload New Asset
					</div>
					<input
						type="file"
						accept="image/png,image/jpeg,image/svg+xml"
						onchange={(e) => onupload(e)}
						class="hidden"
					/>
				</label>
			</div>
		</div>
	</div>
{/if}
