<script>
	import { onMount } from 'svelte';
	import DesignPanel from '$lib/components/DesignPanel.svelte';
	import PreviewPanel from '$lib/components/PreviewPanel.svelte';
	import AssetManagerModal from '$lib/components/AssetManagerModal.svelte';

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
			
			reader.onload = async (e) => {
				const newAsset = {
					id: Date.now().toString(),
					name: file.name,
					type: file.type,
					url: e.target.result,
					timestamp: new Date().toISOString()
				};

				assets = [...assets, newAsset];
				await localStorage.setItem('componentAssets', JSON.stringify(assets));
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

<div class="mx-auto p-4 lg:p-6">
	<div class="flex flex-col gap-6 lg:flex-row">
		<DesignPanel
			prompt={prompt}
			history={history}
			currentIndex={currentIndex}
			imagePreview={imagePreview}
			isLoading={isLoading}
			error={error}
			onsubmit={handleSubmit}
			onundo={undo}
			onredo={redo}
			onshowassets={() => (showAssetManager = true)}
			onexport={exportHistory}
			onimport={importHistory}
			onclear={clearHistory}
			class="lg:w-1/2"
		/>

		<PreviewPanel
			componentDisplay={componentDisplay}
			isLoading={isLoading}
			tokenUsage={tokenUsage}
			class="lg:w-1/2"
		/>
	</div>
</div>
<AssetManagerModal
	show={showAssetManager}
	assets={assets}
	onclose={() => (showAssetManager = false)}
	ondelete={deleteAsset}
	onupload={handleAssetUpload}
/>

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
