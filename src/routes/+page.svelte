<script lang="ts">
  import Nav from '$lib/elements/nav/nav.svelte'; 
  import Hero from '$lib/elements/body/hero.svelte';
  let data: Array<{ id: number; name: string }> = [];
   // Corrected import path for Hero component
  async function loadData() {
    const response = await fetch('/api/data');
    data = await response.json();
  }
</script>

<Nav />

<Hero />