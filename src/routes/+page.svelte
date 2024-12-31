<!-- App.svelte -->
<script>
	// @ts-nocheck

	import { onMount } from 'svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';

	let prompt = $state('');
	let history = $state([]);
	let currentIndex = $state(-1);
	let componentDisplay = $state('');
	let isLoading = $state(false);
	let error = $state(null);
	let referenceImage = null;
	let imagePreview = $state(null);
	let showAssetManager = $state(false);
	let assets = $state([]);
	let tokenUsage = $state({});

	onMount(() => {
		try {
			const savedHistory = localStorage.getItem('componentHistory');
			if (savedHistory) {
				history = JSON.parse(savedHistory).map((item) => ({
					...item,
					timestamp: new Date(item.timestamp)
				}));
				if (history.length > 0) {
					currentIndex = history.length - 1;
					componentDisplay = history[currentIndex].component;
					prompt = history[currentIndex].prompt;
					imagePreview = history[currentIndex].referenceImage;
				}
			}
			const savedAssets = localStorage.getItem('componentAssets');
			if (savedAssets) {
				try {
					assets = JSON.parse(savedAssets);
				} catch (e) {
					console.error('Error loading assets:', e);
					assets = [];
				}
			}
		} catch (e) {
			error = 'Failed to load history from local storage';
			console.error(e);
		}
	});
	async function handleAssetUpload(event) {
		const file = event.target?.files[0];
		if (!file) return;

		try {
			if (!file.type.startsWith('image/')) {
				throw new Error('Please upload an image file');
			}

			const reader = new FileReader();

			reader.onload = (e) => {
				const newAsset = {
					id: Date.now().toString(),
					name: file.name,
					type: file.type,
					url: e.target.result, // This should contain the base64 data URL
					timestamp: new Date().toISOString()
				};

				assets = [...assets, newAsset];
				localStorage.setItem('componentAssets', JSON.stringify(assets));
			};

			reader.readAsDataURL(file);
		} catch (e) {
			error = e.message || 'Failed to upload asset';
			console.error(e);
		}
	}

	function deleteAsset(assetId) {
		assets = assets.filter((asset) => asset.id !== assetId);
		localStorage.setItem('componentAssets', JSON.stringify(assets));
	}

	function removeImage() {
		referenceImage = null;
		imagePreview = null;
	}

	let isSubmitting = false;
	async function handleSubmit() {
		if (isSubmitting) return;
		try {
			isSubmitting = true;
			isLoading = true;
			error = null;
			console.log('Starting handleSubmit'); // New log

			const currentAssets = JSON.parse(localStorage.getItem('componentAssets') || '[]');
			let messages = [];

			if (currentIndex >= 0) {
				messages = [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `Here's my current component and available assets:\n\nAvailable assets: ${currentAssets
									.map((asset) => `\n- Image "${asset.name}" with ID "${asset.id}"`)
									.join(
										''
									)}\n\nCurrent component:\n\`\`\`html\n${history[currentIndex].component}\n\`\`\``
							}
						]
					},
					{
						role: 'assistant',
						content: [
							{
								type: 'text',
								text: `I understand. This is your current component.`
							}
						]
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `Make this specific change to the component: ${prompt}`
							}
						]
					}
				];
			} else {
				messages = [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `Create a component with these requirements: ${prompt}\n\nAvailable assets:\n${currentAssets
									.map((asset) => `- Image "${asset.name}" with ID "${asset.id}"`)
									.join(
										'\n'
									)}\n\nWhen using images, reference them by their ID in the src attribute, like: <img src="asset-id-here" alt="">`
							}
						]
					}
				];
			}

			// Add image if present to the last user message
			if (referenceImage) {
				const mediaTypeMatch = referenceImage.match(/^data:([^;]+);base64,/);
				const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';

				messages[messages.length - 1].content.push({
					type: 'image',
					source: {
						type: 'base64',
						media_type: mediaType,
						data: referenceImage.replace(/^data:image\/[^;]+;base64,/, '')
					}
				});
			}
			console.log('Sending request to server with:', { messages }); // New log

			const systemPrompt =
				currentIndex >= 0
					? 'You are a UI developer. Modify the provided HTML based on the update request. Return only the modified HTML code wrapped in ```html``` tags.'
					: 'You are a UI developer. Create a component using HTML and Tailwind CSS. Return only the code without explanation, wrapped in ```html``` tags.';

			const response = await fetch('/api/claude', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					requestData: {
						model: 'claude-3-5-sonnet-20241022',
						max_tokens: 4096,
						messages,
						system: systemPrompt
					},
					assets: currentAssets
				})
			});
			console.log('Received response from server'); // New log

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to generate component');
			}

			// if (!data.component) {
			// 	throw new Error('No component received from server');
			// }
			console.log('Updating history with new component:', data.component); // New log

			// Update history
			history = [
				...history.slice(0, currentIndex + 1),
				{
					prompt,
					timestamp: new Date(),
					component: data.component,
					referenceImage
				}
			];
			currentIndex = history.length - 1;
			componentDisplay = history[currentIndex].component;

			// Save to localStorage
			localStorage.setItem('componentHistory', JSON.stringify(history));

			tokenUsage = data.token_usage;
		} catch (e) {
			error = e.message || 'Failed to generate component. Please try again.';
			console.error('Error generating component:', e);
			console.error('Error in handleSubmit:', e); // Enhanced error logging
		} finally {
			console.log('Finishing handleSubmit, isLoading set to false'); // New log
			isLoading = false;
			isSubmitting = false;
		}
	}

	function undo() {
		if (currentIndex > 0) {
			currentIndex--;
			componentDisplay = history[currentIndex].component;
			prompt = history[currentIndex].prompt;
			imagePreview = history[currentIndex].referenceImage;
		}
	}

	function redo() {
		if (currentIndex < history.length - 1) {
			currentIndex++;
			componentDisplay = history[currentIndex].component;
			prompt = history[currentIndex].prompt;
			imagePreview = history[currentIndex].referenceImage;
		}
	}

	function loadHistoryItem(index) {
		currentIndex = index;
		componentDisplay = history[index].component;
		prompt = history[index].prompt;
		imagePreview = history[index].referenceImage;
	}

	function exportHistory() {
		const dataStr = JSON.stringify(history, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `component-history-${new Date().toISOString()}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	async function importHistory(event) {
		try {
			error = null;
			const file = event.target.files[0];
			if (!file) return;

			const text = await file.text();
			const importedHistory = JSON.parse(text);

			// Validate imported data structure
			if (
				!Array.isArray(importedHistory) ||
				!importedHistory.every((item) => item.prompt && item.timestamp && item.component)
			) {
				throw new Error('Invalid history file format');
			}

			history = importedHistory.map((item) => ({
				...item,
				timestamp: new Date(item.timestamp)
			}));
			currentIndex = history.length - 1;
			componentDisplay = history[currentIndex].component;
			prompt = history[currentIndex].prompt;
			imagePreview = history[currentIndex].referenceImage;

			localStorage.setItem('componentHistory', JSON.stringify(history));

			// Reset file input
			event.target.value = '';
		} catch (e) {
			error = 'Failed to import history. Please check the file format.';
			console.error(e);
		}
	}

	function clearHistory() {
		if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
			history = [];
			currentIndex = -1;
			componentDisplay = '';
			prompt = '';
			imagePreview = null;
			referenceImage = null;
			localStorage.removeItem('componentHistory');
		}
	}

	// Add these functions to your script section
	function handleDragOver(event) {
		event.preventDefault();
		event.currentTarget.classList.add('bg-gray-100');
	}

	function handleDragLeave(event) {
		event.preventDefault();
		event.currentTarget.classList.remove('bg-gray-100');
	}

	async function handleDrop(event) {
		event.preventDefault();
		event.currentTarget.classList.remove('bg-gray-100');

		const file = event.dataTransfer?.files[0];
		if (file) {
			await handleFile(file);
		}
	}

	async function handleFileInput(event) {
		const file = event.target?.files[0];
		if (file) {
			await handleFile(file);
		}
	}

	async function handleFile(file) {
		try {
			if (!file.type.startsWith('image/')) {
				throw new Error('Please upload an image file');
			}

			const reader = new FileReader();
			reader.onload = (e) => {
				referenceImage = e.target.result;
				imagePreview = e.target.result;
			};
			reader.readAsDataURL(file);
		} catch (e) {
			error = e.message || 'Failed to upload image';
			console.error(e);
		}
	}
</script>

<main class="min-h-screen bg-gray-50">
	<Navbar />

	<div class="mx-auto p-4 lg:p-6">
		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- Left Panel -->
			<div class="flex flex-col gap-6 lg:w-1/2">
				<!-- Input Section -->
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
							onclick={() => (showAssetManager = true)}
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
							onclick={handleSubmit}
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
								onclick={undo}
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
								onclick={redo}
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
								onclick={exportHistory}
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
									onchange={importHistory}
									class="hidden"
									disabled={isLoading}
								/>
							</label>
							<button
								onclick={clearHistory}
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

			<!-- Right Panel -->
			<div class="lg:w-1/2">
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
		</div>
	</div>
	<!-- Asset Manager Modal -->
	{#if showAssetManager}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white p-6">
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-2xl font-semibold">Asset Manager</h2>
					<button
						onclick={() => (showAssetManager = false)}
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
												deleteAsset(asset.id);
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
							onchange={handleAssetUpload}
							class="hidden"
						/>
					</label>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			sans-serif;
		@apply bg-gray-50;
	}

	/* Custom scrollbar styles */
	:global(*::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}

	:global(*::-webkit-scrollbar-track) {
		@apply bg-transparent;
	}

	:global(*::-webkit-scrollbar-thumb) {
		@apply rounded-full bg-gray-300;
	}

	:global(*::-webkit-scrollbar-thumb:hover) {
		@apply bg-gray-400;
	}

	/* Smooth transitions */
	:global(button) {
		@apply transition-all duration-200;
	}

	/* Focus styles */
	:global(*:focus-visible) {
		@apply outline-none ring-2 ring-blue-500 ring-offset-2;
	}
</style>
