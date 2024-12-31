/**
 * @component Navbar
 * @description Main navigation bar for the component designer
 * 
 * @type {{
 *   class?: string                      // Additional CSS classes
 * }}
 */
<script>
  let { class: className = '' } = $props();
</script>

<nav class="border-b bg-white shadow-sm {className}">
  <div class="mx-auto px-4 py-3">
    <h1 class="text-2xl font-semibold text-gray-800">Component Designer</h1>
  </div>
</nav>
