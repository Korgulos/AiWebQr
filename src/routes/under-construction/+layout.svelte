<script>
	let { children } = $props();
  </script>
  
  <div class="bg-gray-50 min-h-screen">
	{@render children()}
  </div>