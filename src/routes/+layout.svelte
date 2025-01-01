<script>
	import '../app.css';
	import Navbar from '$lib/components/layout/Navbar.svelte';

	let { children } = $props();
</script>

<header class="bg-white shadow-sm">
	<Navbar />
</header>
<main class="min-h-screen bg-gray-50">
	{@render children()}
</main>
